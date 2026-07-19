// Prueba real entre dos teléfonos con mock server HTTP local (sin mock de fetch)

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import Fastify from 'fastify';

// Setear variables antes de importar
process.env.WHATSAPP_VERIFY_TOKEN = 'tu_token_de_verificacion_personalizado';
process.env.WHATSAPP_APP_SECRET = 'test_secret';
process.env.ADMIN_TOKEN = 'admin_test_token';
process.env.TEST_PHONE_MADRINA = '5491100000001';
process.env.TEST_PHONE_AHIJADO = '5491100000002';
process.env.WHATSAPP_TOKEN = 'test_token';
process.env.WHATSAPP_PHONE_NUMBER_ID = '1234567890';

import { app } from '../src/server.js';
import { limpiarAlmacen } from '../src/idempotencia.js';

// Mock server que simula la API de WhatsApp
const mockApi = Fastify({ logger: false });
const llamadasApi: { to: string; type: string; template?: string }[] = [];

mockApi.post('/:phoneId/messages', async (request, reply) => {
  const body = request.body as Record<string, unknown>;
  llamadasApi.push({
    to: body.to as string,
    type: body.type as string,
    template: (body.template as { name?: string })?.name,
  });
  return reply.send({ messages: [{ id: 'mock_' + Date.now() }] });
});

function firmar(body: string): string {
  return 'sha256=' + createHmac('sha256', 'test_secret').update(body).digest('hex');
}

function payloadGoal(from: string, id: string): string {
  return JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{
      id: 'entry_1',
      changes: [{
        field: 'messages',
        value: {
          messaging_product: 'whatsapp',
          metadata: { display_phone_number: '123', phone_number_id: '456' },
          messages: [{
            from,
            id,
            timestamp: '1700000000',
            type: 'text',
            text: { body: 'goal' },
          }],
        },
      }],
    }],
  });
}

describe('Prueba real entre dos teléfonos (mock server HTTP, fetch real)', () => {
  let puertoMock = 0;

  before(async () => {
    // Arrancar mock server en puerto aleatorio
    await mockApi.listen({ port: 0, host: '127.0.0.1' });
    puertoMock = (mockApi.server.address() as AddressInfo).port;
    // Apuntar el cliente de WhatsApp al mock server
    process.env.WHATSAPP_API_BASE = `http://127.0.0.1:${puertoMock}`;
  });

  after(async () => {
    delete process.env.WHATSAPP_API_BASE;
    await mockApi.close();
    return app.close();
  });

  beforeEach(() => {
    limpiarAlmacen();
    llamadasApi.length = 0;
  });

  it('madrina envía goal → ahijado recibe template, madrina recibe confirmación', async () => {
    const rawBody = payloadGoal('5491100000001', 'msg_real_1');
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
    assert.equal(llamadasApi.length, 2);

    // Primera llamada: template al ahijado
    assert.equal(llamadasApi[0].to, '5491100000002');
    assert.equal(llamadasApi[0].type, 'template');
    assert.equal(llamadasApi[0].template, 'goal_sintetico');

    // Segunda llamada: texto a la madrina
    assert.equal(llamadasApi[1].to, '5491100000001');
    assert.equal(llamadasApi[1].type, 'text');
  });

  it('remitente no autorizado no dispara goal al ahijado', async () => {
    const rawBody = payloadGoal('5491100000999', 'msg_real_2');
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
    assert.equal(llamadasApi.length, 1);
    assert.equal(llamadasApi[0].to, '5491100000999');
    assert.equal(llamadasApi[0].type, 'text');
  });

  it('idempotencia: segundo webhook con mismo ID no duplica envíos', async () => {
    const rawBody = payloadGoal('5491100000001', 'msg_real_dup');
    const headers = {
      'content-type': 'application/json',
      'x-hub-signature-256': firmar(rawBody),
    };

    const r1 = await app.inject({ method: 'POST', url: '/webhook', headers, payload: rawBody });
    assert.equal(r1.statusCode, 200);
    assert.equal(llamadasApi.length, 2);

    const r2 = await app.inject({ method: 'POST', url: '/webhook', headers, payload: rawBody });
    assert.equal(r2.statusCode, 200);
    assert.equal(llamadasApi.length, 2);
  });

  it('firma con hex inválido devuelve 401, no 500', async () => {
    const rawBody = payloadGoal('5491100000001', 'msg_real_3');
    const resp = await app.inject({
      method: 'POST',
      url: '/webhook',
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': 'sha256=zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
      },
      payload: rawBody,
    });
    assert.equal(resp.statusCode, 401);
  });

  it('firma con longitud incorrecta devuelve 401, no 500', async () => {
    const rawBody = payloadGoal('5491100000001', 'msg_real_4');
    const resp = await app.inject({
      method: 'POST',
      url: '/webhook',
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': 'sha256=abc123',
      },
      payload: rawBody,
    });
    assert.equal(resp.statusCode, 401);
  });

  it('firma con caracteres no hex de 64 chars devuelve 401, no 500', async () => {
    const rawBody = payloadGoal('5491100000001', 'msg_real_5');
    // 64 chars pero con 'g' y 'h' que no son hexadecimales
    const resp = await app.inject({
      method: 'POST',
      url: '/webhook',
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': 'sha256=gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
      },
      payload: rawBody,
    });
    assert.equal(resp.statusCode, 401);
  });
});
