// Pruebas de validación de firma del webhook

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

process.env.WHATSAPP_APP_SECRET = 'test_secret';

import { validarFirma } from '../src/firma.js';

function firmar(body: string, secret: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
}

describe('Validación de firma del webhook', () => {
  it('acepta firma válida', () => {
    const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
    const signature = firmar(body, 'test_secret');
    assert.equal(validarFirma(body, signature), true);
  });

  it('rechaza firma inválida', () => {
    const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
    assert.equal(validarFirma(body, 'sha256=invalida'), false);
  });

  it('rechaza si falta el header', () => {
    const body = JSON.stringify({ test: true });
    assert.equal(validarFirma(body, undefined), false);
  });

  it('rechaza si el body fue modificado', () => {
    const bodyOriginal = JSON.stringify({ data: 'original' });
    const bodyModificado = JSON.stringify({ data: 'modificado' });
    const signature = firmar(bodyOriginal, 'test_secret');
    assert.equal(validarFirma(bodyModificado, signature), false);
  });

  it('rechaza formato sin prefijo sha256=', () => {
    const body = JSON.stringify({ test: true });
    const firma = createHmac('sha256', 'test_secret').update(body).digest('hex');
    assert.equal(validarFirma(body, firma), false);
  });
});
