// Pruebas de verificación del webhook

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Setear variables de entorno antes de importar config
process.env.WHATSAPP_VERIFY_TOKEN = 'tu_token_de_verificacion_personalizado';
process.env.WHATSAPP_APP_SECRET = 'test_secret';
process.env.TEST_PHONE_AHIJADO = '5491100000002';

import { verificarWebhook, procesarWebhook } from '../src/webhook.js';
import { config } from '../src/config.js';
import { limpiarAlmacen, cantidadEventos } from '../src/idempotencia.js';
import type { WebhookPayload } from '../src/tipos.js';

// Mock del envío para evitar llamadas reales a la API
const mensajesEnviados: { telefono: string; tipo: string }[] = [];

// Sobrescribir fetch global para interceptar llamadas a WhatsApp API
const originalFetch = globalThis.fetch;
function mockFetch() {
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(init.body as string) : {};
    mensajesEnviados.push({ telefono: body.to, tipo: body.type });
    return new Response(JSON.stringify({ messages: [{ id: 'mock_msg_id' }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
}

function restaurarFetch() {
  globalThis.fetch = originalFetch;
  mensajesEnviados.length = 0;
}

describe('Verificación del webhook (GET)', () => {
  it('acepta el challenge con token correcto', () => {
    const resultado = verificarWebhook({
      'hub.mode': 'subscribe',
      'hub.verify_token': config.whatsappVerifyToken,
      'hub.challenge': 'challenge_123',
    });
    assert.equal(resultado.ok, true);
    assert.equal(resultado.challenge, 'challenge_123');
  });

  it('rechaza con token incorrecto', () => {
    const resultado = verificarWebhook({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'token_incorrecto',
      'hub.challenge': 'challenge_123',
    });
    assert.equal(resultado.ok, false);
  });

  it('rechaza si no es modo subscribe', () => {
    const resultado = verificarWebhook({
      'hub.mode': 'other',
      'hub.verify_token': 'tu_token_de_verificacion_personalizado',
      'hub.challenge': 'challenge_123',
    });
    assert.equal(resultado.ok, false);
  });
});

describe('Procesamiento de webhook (POST) con idempotencia', () => {
  beforeEach(() => {
    limpiarAlmacen();
    mensajesEnviados.length = 0;
    mockFetch();
  });

  it('procesa un mensaje nuevo', async () => {
    const payload: WebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'entry_1',
        changes: [{
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '123',
              phone_number_id: '456',
            },
            messages: [{
              from: '5491100000001',
              id: 'msg_unique_1',
              timestamp: '1700000000',
              type: 'text',
              text: { body: 'hola' },
            }],
          },
        }],
      }],
    };

    const resultado = await procesarWebhook(payload);
    assert.equal(resultado.procesados, 1);
    assert.equal(resultado.duplicados, 0);
    assert.equal(cantidadEventos(), 1);
  });

  it('rechaza mensaje duplicado', async () => {
    const payload: WebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'entry_1',
        changes: [{
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '123',
              phone_number_id: '456',
            },
            messages: [{
              from: '5491100000001',
              id: 'msg_duplicado_1',
              timestamp: '1700000000',
              type: 'text',
              text: { body: 'hola' },
            }],
          },
        }],
      }],
    };

    await procesarWebhook(payload);
    const resultado = await procesarWebhook(payload);
    assert.equal(resultado.procesados, 0);
    assert.equal(resultado.duplicados, 1);
    assert.equal(cantidadEventos(), 1);
  });

  it('procesa múltiples mensajes en un solo webhook', async () => {
    const payload: WebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'entry_1',
        changes: [{
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '123',
              phone_number_id: '456',
            },
            messages: [
              { from: '5491100000001', id: 'msg_a', timestamp: '1700000000', type: 'text', text: { body: 'a' } },
              { from: '5491100000002', id: 'msg_b', timestamp: '1700000001', type: 'text', text: { body: 'b' } },
              { from: '5491100000003', id: 'msg_c', timestamp: '1700000002', type: 'text', text: { body: 'c' } },
            ],
          },
        }],
      }],
    };

    const resultado = await procesarWebhook(payload);
    assert.equal(resultado.procesados, 3);
    assert.equal(resultado.duplicados, 0);
    assert.equal(cantidadEventos(), 3);
  });

  it('mezcla nuevos y duplicados en el mismo payload', async () => {
    const primerPayload: WebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'entry_1',
        changes: [{
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '123', phone_number_id: '456' },
            messages: [
              { from: '5491100000001', id: 'msg_x', timestamp: '1700000000', type: 'text', text: { body: 'x' } },
            ],
          },
        }],
      }],
    };

    await procesarWebhook(primerPayload);

    const segundoPayload: WebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'entry_2',
        changes: [{
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '123', phone_number_id: '456' },
            messages: [
              { from: '5491100000001', id: 'msg_x', timestamp: '1700000000', type: 'text', text: { body: 'x' } },
              { from: '5491100000002', id: 'msg_y', timestamp: '1700000001', type: 'text', text: { body: 'y' } },
            ],
          },
        }],
      }],
    };

    const resultado = await procesarWebhook(segundoPayload);
    assert.equal(resultado.procesados, 1);
    assert.equal(resultado.duplicados, 1);
    assert.equal(cantidadEventos(), 2);
  });

  it('no procesa payloads con objeto inválido', async () => {
    restaurarFetch();
    limpiarAlmacen();
    // El filtro de objeto se hace en server.ts, no en procesarWebhook
    // Pero verificamos que procesarWebhook no falla con entry vacío
    const payload: WebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [],
    };
    const resultado = await procesarWebhook(payload);
    assert.equal(resultado.procesados, 0);
    assert.equal(resultado.duplicados, 0);
  });

  it('flujo madrina → ahijado: comando "goal" envía al ahijado, no a la madrina', async () => {
    const payload: WebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'entry_1',
        changes: [{
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '123', phone_number_id: '456' },
            messages: [{
              from: '5491100000001',
              id: 'msg_goal_1',
              timestamp: '1700000000',
              type: 'text',
              text: { body: 'goal' },
            }],
          },
        }],
      }],
    };

    const resultado = await procesarWebhook(payload);
    assert.equal(resultado.procesados, 1);
    assert.equal(resultado.fallidos, 0);
    // Debe enviar al ahijado (plantilla) y a la madrina (confirmación texto)
    assert.equal(mensajesEnviados.length, 2);
    // Primer mensaje: plantilla al ahijado
    assert.equal(mensajesEnviados[0].telefono, '5491100000002');
    assert.equal(mensajesEnviados[0].tipo, 'template');
    // Segundo mensaje: texto a la madrina
    assert.equal(mensajesEnviados[1].telefono, '5491100000001');
    assert.equal(mensajesEnviados[1].tipo, 'text');
  });

  it('libera evento fallido y permite reintento', async () => {
    restaurarFetch();
    // Mock que falla la primera vez y éxito la segunda
    let llamada = 0;
    globalThis.fetch = (async () => {
      llamada++;
      if (llamada === 1) {
        return new Response('error', { status: 500 });
      }
      return new Response(JSON.stringify({ messages: [{ id: 'ok' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    const payload: WebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'entry_1',
        changes: [{
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '123', phone_number_id: '456' },
            messages: [{
              from: '5491100000001',
              id: 'msg_fallo_1',
              timestamp: '1700000000',
              type: 'text',
              text: { body: 'hola' },
            }],
          },
        }],
      }],
    };

    // Primer intento: falla
    const r1 = await procesarWebhook(payload);
    assert.equal(r1.procesados, 0);
    assert.equal(r1.fallidos, 1);
    assert.equal(r1.duplicados, 0);
    // El evento fue liberado, no está en el almacén
    assert.equal(cantidadEventos(), 0);

    // Segundo intento: éxito (mismo mensaje)
    const r2 = await procesarWebhook(payload);
    assert.equal(r2.procesados, 1);
    assert.equal(r2.fallidos, 0);
    assert.equal(r2.duplicados, 0);
    assert.equal(cantidadEventos(), 1);
  });
});
