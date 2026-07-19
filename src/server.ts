// Servidor Fastify

import Fastify from 'fastify';
import { config, validarConfig } from './config.js';
import { verificarWebhook, procesarWebhook } from './webhook.js';
import { validarFirma } from './firma.js';
import { enviarTexto, enviarPlantilla, enviarGoalSintetico } from './whatsapp.js';
import type { WebhookPayload } from './tipos.js';

// rawBody para validar firma HMAC con el body exacto que envió Meta
const app = Fastify({ logger: true });
app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
  const raw = body.toString();
  (req as unknown as { rawBody: string }).rawBody = raw;
  try {
    done(null, JSON.parse(raw));
  } catch (err) {
    done(err as Error, undefined);
  }
});

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
  // Validar firma HMAC SHA-256 con rawBody (no JSON reconstruido)
  const rawBody = (request as unknown as { rawBody?: string }).rawBody;
  const signature = request.headers['x-hub-signature-256'] as string | undefined;
  if (!rawBody || !validarFirma(rawBody, signature)) {
    request.log.warn('Webhook rechazado: firma inválida');
    return reply.code(401).send('Firma inválida');
  }

  const payload = request.body as WebhookPayload;

  if (payload.object !== 'whatsapp_business_account') {
    return reply.code(400).send('Objeto inválido');
  }

  const resultado = await procesarWebhook(payload);
  request.log.info({ procesados: resultado.procesados, duplicados: resultado.duplicados, fallidos: resultado.fallidos }, 'Webhook procesado');
  // Si hubo fallos, devolver 500 para que Meta reintente
  if (resultado.fallidos > 0) {
    return reply.code(500).send('EVENT_FAILED');
  }
  return reply.code(200).send('EVENT_RECEIVED');
});

// Teléfonos permitidos para endpoints de prueba
const telefonosPermitidos = new Set<string>();
function telefonosTest(): Set<string> {
  telefonosPermitidos.clear();
  if (config.testPhoneMadrina) telefonosPermitidos.add(config.testPhoneMadrina);
  if (config.testPhoneAhijado) telefonosPermitidos.add(config.testPhoneAhijado);
  return telefonosPermitidos;
}

function validarTelefonoTest(telefono: string): boolean {
  return telefonosTest().has(telefono);
}

// Endpoint de prueba: envía texto dentro de ventana
app.post('/test/texto', async (request, reply) => {
  if (!await requerirAdmin(request, reply)) return;
  const { telefono, mensaje } = request.body as { telefono?: string; mensaje?: string };
  if (!telefono || !mensaje) {
    return reply.code(400).send({ error: 'Faltan telefono o mensaje' });
  }
  if (!validarTelefonoTest(telefono)) {
    return reply.code(403).send({ error: 'Telefono no permitido en pruebas' });
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
  if (!validarTelefonoTest(telefono)) {
    return reply.code(403).send({ error: 'Telefono no permitido en pruebas' });
  }
  const resultado = await enviarPlantilla(telefono, config.templateName, config.templateLanguage);
  return reply.code(resultado.ok ? 200 : 500).send(resultado);
});

// Endpoint de prueba: envía goal sintético con plantilla al ahijado
app.post('/test/goal', async (request, reply) => {
  if (!await requerirAdmin(request, reply)) return;
  const destino = config.testPhoneAhijado;
  if (!destino) {
    return reply.code(400).send({ error: 'Falta TEST_PHONE_AHIJADO' });
  }
  const { tarea, plazo } = request.body as { tarea?: string; plazo?: string };
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

// Solo arrancar si se ejecuta directamente (no cuando se importa para tests)
const esEntradaDirecta = process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js');
if (esEntradaDirecta) {
  iniciar();
}

export { app, iniciar };
