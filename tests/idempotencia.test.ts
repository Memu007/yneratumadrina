// Pruebas de idempotencia

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { reservarEvento, confirmarProcesado, liberarEvento, limpiarAlmacen, cantidadEventos } from '../src/idempotencia.js';

describe('Idempotencia', () => {
  beforeEach(() => limpiarAlmacen());

  it('reserva un evento nuevo la primera vez', () => {
    const resultado = reservarEvento('msg_001');
    assert.equal(resultado, true);
    assert.equal(cantidadEventos(), 1);
  });

  it('rechaza un evento duplicado', () => {
    reservarEvento('msg_001');
    const resultado = reservarEvento('msg_001');
    assert.equal(resultado, false);
    assert.equal(cantidadEventos(), 1);
  });

  it('procesa eventos distintos como independientes', () => {
    reservarEvento('msg_001');
    reservarEvento('msg_002');
    reservarEvento('msg_003');
    assert.equal(cantidadEventos(), 3);
  });

  it('rechaza duplicados mezclados con nuevos', () => {
    reservarEvento('msg_001');
    reservarEvento('msg_002');
    assert.equal(reservarEvento('msg_001'), false);
    assert.equal(reservarEvento('msg_003'), true);
    assert.equal(cantidadEventos(), 3);
  });

  it('libera un evento fallido y permite reintento', () => {
    reservarEvento('msg_001');
    assert.equal(reservarEvento('msg_001'), false);
    liberarEvento('msg_001');
    assert.equal(cantidadEventos(), 0);
    // Después de liberar, se puede reservar de nuevo
    assert.equal(reservarEvento('msg_001'), true);
    assert.equal(cantidadEventos(), 1);
  });

  it('confirmarProcesado mantiene el evento en el almacén', () => {
    reservarEvento('msg_001');
    confirmarProcesado('msg_001');
    assert.equal(cantidadEventos(), 1);
    assert.equal(reservarEvento('msg_001'), false);
  });
});
