// Servidor Fastify

import Fastify from 'fastify';
import { config, validarConfig } from './config.js';
import { verificarWebhook, procesarWebhook } from './webhook.js';
import { validarFirma } from './firma.js';
import { enviarTexto, enviarPlantilla, enviarGoalSintetico } from './whatsapp.js';
import type { WebhookPayload } from './tipos.js';

const app = Fastify({ logger: true });

// Middleware: requiere header Authorization: Bearer <ADMIN_TOKEN>
async function requerirAdmin(request: { headers: Record<string, string | string[] | undefined> }, reply: { code: (c: number) => { send: (b: unknown) => void } }): Promise<boolean> {
  const auth = request.headers['authorization'];
  const token = Array.isArray(auth) ? auth[0] : auth;
  if (!token || token !== `Bearer ${config.adminToken}`) {
    reply.code(401).send({ error: 'No autorizado' });
    return false;
  }
  return true;
}

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

// Recepción de webhooks (POST) con validación de firma
app.post('/webhook', async (request, reply) => {
  // Validar firma HMAC SHA-256
  const body = JSON.stringify(request.body);
  const signature = request.headers['x-hub-signature-256'] as string | undefined;
  if (!validarFirma(body, signature)) {
    request.log.warn('Webhook rechazado: firma inválida');
    return reply.code(401).send('Firma inválida');
  }

  const payload = request.body as WebhookPayload;

  if (payload.object !== 'whatsapp_business_account') {
    return reply.code(400).send('Objeto inválido');
  }

  const resultado = await procesarWebhook(payload);
  request.log.info({ procesados: resultado.procesados, duplicados: resultado.duplicados, fallidos: resultado.fallidos }, 'Webhook procesado');
  return reply.code(200).send('EVENT_RECEIVED');
});

// Endpoint de prueba: envía texto dentro de ventana
app.post('/test/texto', async (request, reply) => {
  if (!await requerirAdmin(request, reply)) return;
  const { telefono, mensaje } = request.body as { telefono?: string; mensaje?: string };
  if (!telefono || !mensaje) {
    return reply.code(400).send({ error: 'Faltan telefono o mensaje' });
  }
  const resultado = await enviarTexto(telefono, mensaje);
  return reply.code(resultado.ok ? 200 : 500).send(resultado);
});

// Endpoint de prueba: envía plantilla fuera de ventana
app.post('/test/plantilla', async (request, reply) => {
  if (!await requerirAdmin(request, reply)) return;
  const { telefono } = request.body as { telefono?: string };
  if (!telefono) {
    return reply.code(400).send({ error: 'Falta telefono' });
  }
  const resultado = await enviarPlantilla(telefono, config.templateName, config.templateLanguage);
  return reply.code(resultado.ok ? 200 : 500).send(resultado);
});

// Endpoint de prueba: envía goal sintético con plantilla al ahijado
app.post('/test/goal', async (request, reply) => {
  if (!await requerirAdmin(request, reply)) return;
  const { telefono, tarea, plazo } = request.body as { telefono?: string; tarea?: string; plazo?: string };
  const destino = telefono || config.testPhoneAhijado;
  if (!destino) {
    return reply.code(400).send({ error: 'Falta telefono o TEST_PHONE_AHIJADO' });
  }
  const resultado = await enviarGoalSintetico(
    destino,
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
