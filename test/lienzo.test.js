const test = require('node:test');
const assert = require('node:assert/strict');
require('../comun/lienzo.js');
const { Lienzo } = globalThis;

test('sin almacenamiento (modo privado) el récord no baja durante la sesión', () => {
  globalThis.localStorage = {
    getItem() { throw new Error('bloqueado'); },
    setItem() { throw new Error('bloqueado'); },
  };
  try {
    assert.equal(Lienzo.guardarRecord('prueba-privado', 50), 50);
    assert.equal(Lienzo.guardarRecord('prueba-privado', 20), 50);
    assert.equal(Lienzo.leerRecord('prueba-privado'), 50);
  } finally {
    delete globalThis.localStorage;
  }
});

test('con almacenamiento el récord se guarda y solo sube', () => {
  const datos = new Map();
  globalThis.localStorage = { getItem: (k) => datos.get(k) ?? null, setItem: (k, v) => datos.set(k, v) };
  try {
    assert.equal(Lienzo.guardarRecord('prueba-normal', 30), 30);
    assert.equal(Lienzo.guardarRecord('prueba-normal', 10), 30);
    assert.equal(datos.get('prueba-normal'), '30');
  } finally {
    delete globalThis.localStorage;
  }
});
