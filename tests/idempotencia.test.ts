// Pruebas de idempotencia

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { marcarProcesado, limpiarAlmacen, cantidadEventos } from '../src/idempotencia.js';

describe('Idempotencia', () => {
  beforeEach(() => limpiarAlmacen());

  it('procesa un evento nuevo la primera vez', () => {
    const resultado = marcarProcesado('msg_001');
    assert.equal(resultado, true);
    assert.equal(cantidadEventos(), 1);
  });

  it('rechaza un evento duplicado', () => {
    marcarProcesado('msg_001');
    const resultado = marcarProcesado('msg_001');
    assert.equal(resultado, false);
    assert.equal(cantidadEventos(), 1);
  });

  it('procesa eventos distintos como independientes', () => {
    marcarProcesado('msg_001');
    marcarProcesado('msg_002');
    marcarProcesado('msg_003');
    assert.equal(cantidadEventos(), 3);
  });

  it('rechaza duplicados mezclados con nuevos', () => {
    marcarProcesado('msg_001');
    marcarProcesado('msg_002');
    assert.equal(marcarProcesado('msg_001'), false);
    assert.equal(marcarProcesado('msg_003'), true);
    assert.equal(cantidadEventos(), 3);
  });
});
