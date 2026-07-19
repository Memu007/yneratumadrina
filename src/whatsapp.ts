// Cliente de WhatsApp Cloud API

import { config } from './config.js';

const API_BASE = 'https://graph.facebook.com/v21.0';

interface RespuestaEnvio {
  ok: boolean;
  messageId?: string;
  error?: string;
}

// Envía texto simple dentro de la ventana de servicio (24h)
export async function enviarTexto(telefono: string, mensaje: string): Promise<RespuestaEnvio> {
  return enviarMensaje({
    messaging_product: 'whatsapp',
    to: telefono,
    type: 'text',
    text: { body: mensaje },
  });
}

// Envía plantilla utility fuera de ventana de servicio
export async function enviarPlantilla(
  telefono: string,
  nombrePlantilla: string,
  idioma: string,
  componentes?: unknown[]
): Promise<RespuestaEnvio> {
  const template: Record<string, unknown> = {
    name: nombrePlantilla,
    language: { code: idioma },
  };
  if (componentes) {
    template.components = componentes;
  }
  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    to: telefono,
    type: 'template',
    template,
  };
  return enviarMensaje(payload);
}

// Envía el goal sintético usando la plantilla utility aprobada
export async function enviarGoalSintetico(telefono: string, tarea: string, plazo: string): Promise<RespuestaEnvio> {
  const componentes = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: tarea },
        { type: 'text', text: plazo },
      ],
    },
  ];
  return enviarPlantilla(telefono, config.templateName, config.templateLanguage, componentes);
}

async function enviarMensaje(payload: Record<string, unknown>): Promise<RespuestaEnvio> {
  try {
    const url = `${API_BASE}/${config.whatsappPhoneNumberId}/messages`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.whatsappToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errorBody = await resp.text();
      return { ok: false, error: `HTTP ${resp.status}: ${errorBody}` };
    }

    const data = await resp.json() as { messages?: { id: string }[] };
    const messageId = data.messages?.[0]?.id;
    return { ok: true, messageId };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
