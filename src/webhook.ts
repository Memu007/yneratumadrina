// Manejo de webhooks de WhatsApp Cloud API

import { marcarProcesado } from './idempotencia.js';
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
export async function procesarWebhook(payload: WebhookPayload): Promise<{ procesados: number; duplicados: number }> {
  let procesados = 0;
  let duplicados = 0;

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const messages = change.value.messages;
      if (!messages) continue;

      for (const msg of messages) {
        const esNuevo = marcarProcesado(msg.id);
        if (!esNuevo) {
          duplicados++;
          continue;
        }
        await procesarMensaje(msg);
        procesados++;
      }
    }
  }

  return { procesados, duplicados };
}

// Procesa un mensaje individual
async function procesarMensaje(msg: MensajeEntrante): Promise<void> {
  const telefono = msg.from;
  const texto = msg.text?.body || msg.button?.text || '';

  // Comando de prueba: enviar goal sintético
  if (texto.toLowerCase() === 'goal') {
    await enviarGoalSintetico(
      telefono,
      'Sacar la basura',
      'hoy 20:00'
    );
    return;
  }

  // Echo: responder dentro de ventana de servicio
  await enviarTexto(telefono, `Recibido: ${texto}`);
}
