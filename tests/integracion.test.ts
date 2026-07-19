// Pruebas de integración con app.inject

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

// Setear variables de entorno antes de importar
process.env.WHATSAPP_VERIFY_TOKEN = 'tu_token_de_verificacion_personalizado';
process.env.WHATSAPP_APP_SECRET = 'test_secret';
process.env.ADMIN_TOKEN = 'admin_test_token';
process.env.TEST_PHONE_MADRINA = '5491100000001';
process.env.TEST_PHONE_AHIJADO = '5491100000002';
process.env.WHATSAPP_TOKEN = 'test_token';
process.env.WHATSAPP_PHONE_NUMBER_ID = '1234567890';

import { app } from '../src/server.js';
import { limpiarAlmacen } from '../src/idempotencia.js';

// Mock de fetch para interceptar llamadas a WhatsApp API
const llamadas: { url: string; body: Record<string, unknown> }[] = [];
const originalFetch = globalThis.fetch;

function mockFetch() {
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(init.body as string) : {};
    llamadas.push({ url: String(url), body });
    return new Response(JSON.stringify({ messages: [{ id: 'mock_msg_id' }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
}

function restaurarFetch() {
  globalThis.fetch = originalFetch;
  llamadas.length = 0;
}

function firmar(body: string): string {
  return 'sha256=' + createHmac('sha256', 'test_secret').update(body).digest('hex');
}

describe('Integración con app.inject', () => {
  before(() => {
    mockFetch();
  });

  after(() => {
    restaurarFetch();
    return app.close();
  });

  beforeEach(() => {
    limpiarAlmacen();
    llamadas.length = 0;
  });

  it('GET /health responde ok', async () => {
    const resp = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(resp.statusCode, 200);
    const body = JSON.parse(resp.body);
    assert.equal(body.estado, 'ok');
  });

  it('GET /webhook verifica challenge con token correcto', async () => {
    const resp = await app.inject({
      method: 'GET',
      url: '/webhook?hub.mode=subscribe&hub.verify_token=tu_token_de_verificacion_personalizado&hub.challenge=challenge_abc',
    });
    assert.equal(resp.statusCode, 200);
    assert.equal(resp.body, 'challenge_abc');
  });

  it('GET /webhook rechaza token incorrecto', async () => {
    const resp = await app.inject({
      method: 'GET',
      url: '/webhook?hub.mode=subscribe&hub.verify_token=incorrecto&hub.challenge=challenge_abc',
    });
    assert.equal(resp.statusCode, 403);
  });

  it('POST /webhook rechaza firma inválida', async () => {
    const payload = { object: 'whatsapp_business_account', entry: [] };
    const resp = await app.inject({
      method: 'POST',
      url: '/webhook',
      headers: { 'content-type': 'application/json', 'x-hub-signature-256': 'sha256=invalida' },
      payload: JSON.stringify(payload),
    });
    assert.equal(resp.statusCode, 401);
  });

  it('POST /webhook con firma válida procesa mensaje de la madrina → ahijado', async () => {
    const payload = {
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
              id: 'msg_inject_1',
              timestamp: '1700000000',
              type: 'text',
              text: { body: 'goal' },
            }],
          },
        }],
      }],
    };
    const rawBody = JSON.stringify(payload);
    const resp = await app.inject({
      method: 'POST',
      url: '/webhook',
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': firmar(rawBody),
      },
      payload: rawBody,
    });
    assert.equal(resp.statusCode, 200);
    // Debe enviar al ahijado (template) y a la madrina (text)
    assert.equal(llamadas.length, 2);
    assert.equal(llamadas[0].body.to, '5491100000002');
    assert.equal(llamadas[0].body.type, 'template');
    assert.equal(llamadas[1].body.to, '5491100000001');
    assert.equal(llamadas[1].body.type, 'text');
  });

  it('POST /webhook con remitente no autorizado no dispara goal', async () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'entry_1',
        changes: [{
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '123', phone_number_id: '456' },
            messages: [{
              from: '5491100000999',
              id: 'msg_inject_2',
              timestamp: '1700000000',
              type: 'text',
              text: { body: 'goal' },
            }],
          },
        }],
      }],
    };
    const rawBody = JSON.stringify(payload);
    const resp = await app.inject({
      method: 'POST',
      url: '/webhook',
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': firmar(rawBody),
      },
      payload: rawBody,
    });
    assert.equal(resp.statusCode, 200);
    // Solo debe enviar el rechazo al remitente, no goal al ahijado
    assert.equal(llamadas.length, 1);
    assert.equal(llamadas[0].body.to, '5491100000999');
    assert.equal(llamadas[0].body.type, 'text');
  });

  it('POST /webhook idempotente: segundo envío del mismo ID es duplicado', async () => {
    const payload = {
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
              id: 'msg_inject_dup',
              timestamp: '1700000000',
              type: 'text',
              text: { body: 'hola' },
            }],
          },
        }],
      }],
    };
    const rawBody = JSON.stringify(payload);
    const headers = {
      'content-type': 'application/json',
      'x-hub-signature-256': firmar(rawBody),
    };

    const r1 = await app.inject({ method: 'POST', url: '/webhook', headers, payload: rawBody });
    assert.equal(r1.statusCode, 200);
    assert.equal(llamadas.length, 1);

    const r2 = await app.inject({ method: 'POST', url: '/webhook', headers, payload: rawBody });
    assert.equal(r2.statusCode, 200);
    // No debe enviar nada nuevo (duplicado)
    assert.equal(llamadas.length, 1);
  });

  it('POST /webhook devuelve 500 si el envío falla (para reintento de Meta)', async () => {
    restaurarFetch();
    globalThis.fetch = (async () => {
      return new Response('error', { status: 500 });
    }) as typeof fetch;

    const payload = {
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
              id: 'msg_inject_fail',
              timestamp: '1700000000',
              type: 'text',
              text: { body: 'hola' },
            }],
          },
        }],
      }],
    };
    const rawBody = JSON.stringify(payload);
    const resp = await app.inject({
      method: 'POST',
      url: '/webhook',
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': firmar(rawBody),
      },
      payload: rawBody,
    });
    assert.equal(resp.statusCode, 500);

    mockFetch();
  });

  it('POST /test/texto rechaza sin auth', async () => {
    const resp = await app.inject({
      method: 'POST',
      url: '/test/texto',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ telefono: '5491100000001', mensaje: 'hola' }),
    });
    assert.equal(resp.statusCode, 401);
  });

  it('POST /test/texto rechaza teléfono no permitido', async () => {
    const resp = await app.inject({
      method: 'POST',
      url: '/test/texto',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer admin_test_token',
      },
      payload: JSON.stringify({ telefono: '5499999999999', mensaje: 'hola' }),
    });
    assert.equal(resp.statusCode, 403);
  });

  it('POST /test/texto envía a teléfono permitido', async () => {
    const resp = await app.inject({
      method: 'POST',
      url: '/test/texto',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer admin_test_token',
      },
      payload: JSON.stringify({ telefono: '5491100000001', mensaje: 'hola' }),
    });
    assert.equal(resp.statusCode, 200);
    assert.equal(llamadas.length, 1);
    assert.equal(llamadas[0].body.to, '5491100000001');
  });

  it('POST /test/goal envía solo al ahijado, sin teléfono arbitrario', async () => {
    const resp = await app.inject({
      method: 'POST',
      url: '/test/goal',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer admin_test_token',
      },
      payload: JSON.stringify({}),
    });
    assert.equal(resp.statusCode, 200);
    assert.equal(llamadas.length, 1);
    assert.equal(llamadas[0].body.to, '5491100000002');
    assert.equal(llamadas[0].body.type, 'template');
  });
});
