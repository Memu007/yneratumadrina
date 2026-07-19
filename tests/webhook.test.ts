// Pruebas de verificación del webhook

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Setear variable de entorno antes de importar config
process.env.WHATSAPP_VERIFY_TOKEN = 'tu_token_de_verificacion_personalizado';

import { verificarWebhook, procesarWebhook } from '../src/webhook.js';
import { config } from '../src/config.js';
import { limpiarAlmacen, cantidadEventos } from '../src/idempotencia.js';
import type { WebhookPayload } from '../src/tipos.js';

// Mock del envío para evitar llamadas reales a la API
const mensajesEnviados: { telefono: string; tipo: string }[] = [];

// Sobrescribir fetch global para interceptar llamadas a WhatsApp API
const originalFetch = globalThis.fetch;
function mockFetch() {
  globalThis.fetch = (async () => {
    mensajesEnviados.push({ telefono: 'mock', tipo: 'mock' });
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
});
