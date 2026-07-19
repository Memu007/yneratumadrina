// Pruebas del cliente de WhatsApp

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const llamadas: { url: string; method: string; body: Record<string, unknown> }[] = [];
const originalFetch = globalThis.fetch;

function mockFetch(status = 200, respuesta: unknown = { messages: [{ id: 'wamid.test123' }] }) {
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(init.body as string) : {};
    llamadas.push({ url: String(url), method: init?.method || 'GET', body });
    return new Response(JSON.stringify(respuesta), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
}

function restaurarFetch() {
  globalThis.fetch = originalFetch;
  llamadas.length = 0;
}

describe('Cliente de WhatsApp', () => {
  beforeEach(() => {
    llamadas.length = 0;
    mockFetch();
  });

  afterEach(() => restaurarFetch());

  it('enviarTexto arma el payload correcto', async () => {
    const { enviarTexto } = await import('../src/whatsapp.js');
    const resultado = await enviarTexto('5491100000001', 'Hola mundo');

    assert.equal(resultado.ok, true);
    assert.equal(resultado.messageId, 'wamid.test123');
    assert.equal(llamadas.length, 1);
    assert.equal(llamadas[0].body.messaging_product, 'whatsapp');
    assert.equal(llamadas[0].body.to, '5491100000001');
    assert.equal(llamadas[0].body.type, 'text');
    assert.deepEqual(llamadas[0].body.text, { body: 'Hola mundo' });
  });

  it('enviarPlantilla arma el payload con template', async () => {
    const { enviarPlantilla } = await import('../src/whatsapp.js');
    const resultado = await enviarPlantilla('5491100000001', 'goal_sintetico', 'es_AR');

    assert.equal(resultado.ok, true);
    assert.equal(llamadas[0].body.type, 'template');
    const template = llamadas[0].body.template as Record<string, unknown>;
    assert.equal(template.name, 'goal_sintetico');
    assert.deepEqual(template.language, { code: 'es_AR' });
  });

  it('enviarGoalSintetico incluye componentes con parámetros', async () => {
    const { enviarGoalSintetico } = await import('../src/whatsapp.js');
    const resultado = await enviarGoalSintetico('5491100000001', 'Sacar la basura', 'hoy 20:00');

    assert.equal(resultado.ok, true);
    assert.equal(llamadas[0].body.type, 'template');
    const template = llamadas[0].body.template as Record<string, unknown>;
    const componentes = template.components as { type: string; parameters: { type: string; text: string }[] }[];
    assert.equal(componentes[0].type, 'body');
    assert.equal(componentes[0].parameters[0].text, 'Sacar la basura');
    assert.equal(componentes[0].parameters[1].text, 'hoy 20:00');
  });

  it('maneja error HTTP de la API', async () => {
    restaurarFetch();
    mockFetch(401, { error: { message: 'Token inválido' } } as Record<string, unknown>);
    const { enviarTexto } = await import('../src/whatsapp.js');
    const resultado = await enviarTexto('5491100000001', 'test');

    assert.equal(resultado.ok, false);
    assert.ok(resultado.error?.includes('401'));
  });
});
