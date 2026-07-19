// Tests de validación de configuración

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { validarConfig } from '../src/config.js';

const BASE_ENV = { ...process.env };

describe('validarConfig', () => {
  beforeEach(() => {
    process.env = { ...BASE_ENV };
  });

  it('falla si falta TEST_PHONE_MADRINA', () => {
    process.env.WHATSAPP_TOKEN = 'x';
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'x';
    process.env.WHATSAPP_VERIFY_TOKEN = 'x';
    process.env.WHATSAPP_APP_SECRET = 'x';
    process.env.ADMIN_TOKEN = 'x';
    process.env.TEST_PHONE_AHIJADO = '5491100000002';
    delete process.env.TEST_PHONE_MADRINA;
    assert.throws(() => validarConfig(), /TEST_PHONE_MADRINA/);
  });

  it('falla si falta TEST_PHONE_AHIJADO', () => {
    process.env.WHATSAPP_TOKEN = 'x';
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'x';
    process.env.WHATSAPP_VERIFY_TOKEN = 'x';
    process.env.WHATSAPP_APP_SECRET = 'x';
    process.env.ADMIN_TOKEN = 'x';
    process.env.TEST_PHONE_MADRINA = '5491100000001';
    delete process.env.TEST_PHONE_AHIJADO;
    assert.throws(() => validarConfig(), /TEST_PHONE_AHIJADO/);
  });

  it('falla si faltan ambos teléfonos', () => {
    process.env.WHATSAPP_TOKEN = 'x';
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'x';
    process.env.WHATSAPP_VERIFY_TOKEN = 'x';
    process.env.WHATSAPP_APP_SECRET = 'x';
    process.env.ADMIN_TOKEN = 'x';
    delete process.env.TEST_PHONE_MADRINA;
    delete process.env.TEST_PHONE_AHIJADO;
    assert.throws(() => validarConfig(), /TEST_PHONE_MADRINA.*TEST_PHONE_AHIJADO|TEST_PHONE_AHIJADO.*TEST_PHONE_MADRINA/);
  });

  it('pasa si todos los requeridos están presentes', () => {
    process.env.WHATSAPP_TOKEN = 'x';
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'x';
    process.env.WHATSAPP_VERIFY_TOKEN = 'x';
    process.env.WHATSAPP_APP_SECRET = 'x';
    process.env.ADMIN_TOKEN = 'x';
    process.env.TEST_PHONE_MADRINA = '5491100000001';
    process.env.TEST_PHONE_AHIJADO = '5491100000002';
    assert.doesNotThrow(() => validarConfig());
  });
});
