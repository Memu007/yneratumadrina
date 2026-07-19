// Manejo de webhooks de WhatsApp Cloud API

import { reservarEvento, confirmarProcesado, liberarEvento } from './idempotencia.js';
import { enviarTexto, enviarGoalSintetico } from './whatsapp.js';
import { config } from './config.js';
import type { WebhookPayload, MensajeEntrante } from './tipos.js';

// Verifica el challenge de Meta
export function verificarWebhook(query: Record<string, string | string[]>): { ok: boolean; challenge?: string } {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  if (mode === 'subscribe' && token === config.whatsappVerifyToken) {
    return { ok: true, challenge: Array.isArray(challenge) ? challenge[0] : challenge };
  }
  return { ok: false };
}

// Procesa el payload del webhook con idempotencia
export async function procesarWebhook(payload: WebhookPayload): Promise<{ procesados: number; duplicados: number; fallidos: number }> {
  let procesados = 0;
  let duplicados = 0;
  let fallidos = 0;

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const messages = change.value.messages;
      if (!messages) continue;

      for (const msg of messages) {
        const esNuevo = reservarEvento(msg.id);
        if (!esNuevo) {
          duplicados++;
          continue;
        }
        try {
          await procesarMensaje(msg);
          confirmarProcesado(msg.id);
          procesados++;
        } catch (err) {
          liberarEvento(msg.id);
          fallidos++;
        }
      }
    }
  }

  return { procesados, duplicados, fallidos };
}

// Procesa un mensaje individual con flujo madrina → ahijado
async function procesarMensaje(msg: MensajeEntrante): Promise<void> {
  const telefono = msg.from;
  const texto = msg.text?.body || msg.button?.text || '';

  // Comando de prueba: la madrina envía "goal" y el bot envía el goal al ahijado
  if (texto.toLowerCase() === 'goal') {
    if (!config.testPhoneAhijado) {
      throw new Error('No hay teléfono de ahijado configurado');
    }
    // Enviar el goal al ahijado
    const r1 = await enviarGoalSintetico(
      config.testPhoneAhijado,
      'Sacar la basura',
      'hoy 20:00'
    );
    if (!r1.ok) throw new Error(`Error enviando goal: ${r1.error}`);
    // Confirmar a la madrina que se envió
    const r2 = await enviarTexto(telefono, 'Goal enviado al ahijado.');
    if (!r2.ok) throw new Error(`Error enviando confirmación: ${r2.error}`);
    return;
  }

  // Echo: responder dentro de ventana de servicio
  const r = await enviarTexto(telefono, `Recibido: ${texto}`);
  if (!r.ok) throw new Error(`Error enviando respuesta: ${r.error}`);
}
