// Servidor Fastify

import Fastify from 'fastify';
import { config, validarConfig } from './config.js';
import { verificarWebhook, procesarWebhook } from './webhook.js';
import { enviarTexto, enviarPlantilla, enviarGoalSintetico } from './whatsapp.js';
import type { WebhookPayload } from './tipos.js';

const app = Fastify({ logger: true });

// Endpoint de salud
app.get('/health', async () => {
  return { estado: 'ok', timestamp: new Date().toISOString() };
});

// Verificación del webhook (GET)
app.get('/webhook', async (request, reply) => {
  const query = request.query as Record<string, string | string[]>;
  const resultado = verificarWebhook(query);
  if (resultado.ok && resultado.challenge) {
    return reply.code(200).send(resultado.challenge);
  }
  return reply.code(403).send('Verificación fallida');
});

// Recepción de webhooks (POST)
app.post('/webhook', async (request, reply) => {
  const payload = request.body as WebhookPayload;

  if (payload.object !== 'whatsapp_business_account') {
    return reply.code(400).send('Objeto inválido');
  }

  const resultado = await procesarWebhook(payload);
  request.log.info({ procesados: resultado.procesados, duplicados: resultado.duplicados }, 'Webhook procesado');
  return reply.code(200).send('EVENT_RECEIVED');
});

// Endpoint de prueba: envía texto dentro de ventana
app.post('/test/texto', async (request, reply) => {
  const { telefono, mensaje } = request.body as { telefono?: string; mensaje?: string };
  if (!telefono || !mensaje) {
    return reply.code(400).send({ error: 'Faltan telefono o mensaje' });
  }
  const resultado = await enviarTexto(telefono, mensaje);
  return reply.code(resultado.ok ? 200 : 500).send(resultado);
});

// Endpoint de prueba: envía plantilla fuera de ventana
app.post('/test/plantilla', async (request, reply) => {
  const { telefono } = request.body as { telefono?: string };
  if (!telefono) {
    return reply.code(400).send({ error: 'Falta telefono' });
  }
  const resultado = await enviarPlantilla(telefono, config.templateName, config.templateLanguage);
  return reply.code(resultado.ok ? 200 : 500).send(resultado);
});

// Endpoint de prueba: envía goal sintético con plantilla
app.post('/test/goal', async (request, reply) => {
  const { telefono, tarea, plazo } = request.body as { telefono?: string; tarea?: string; plazo?: string };
  if (!telefono) {
    return reply.code(400).send({ error: 'Falta telefono' });
  }
  const resultado = await enviarGoalSintetico(
    telefono,
    tarea || 'Sacar la basura',
    plazo || 'hoy 20:00'
  );
  return reply.code(resultado.ok ? 200 : 500).send(resultado);
});

async function iniciar() {
  try {
    validarConfig();
    await app.listen({ port: config.puerto, host: '0.0.0.0' });
    app.log.info(`Servidor escuchando en puerto ${config.puerto}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

iniciar();

export { app };
