const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../juegos/limpiavidrios/logica.js');

const quieto = { columna: null, limpiar: false };

test('limpiar baja la suciedad solo del vidrio donde está el andamio', () => {
  const e = L.crearEstado(7);
  e.proximoPeligro = 99;
  const antes = [...e.vidrios];
  L.paso(e, 0.5, { columna: null, limpiar: true });
  assert.ok(e.vidrios[1] < antes[1]);
  assert.equal(e.vidrios[0], antes[0]);
  assert.equal(e.vidrios[2], antes[2]);
});

test('el andamio se mueve hacia la columna pedida sin pasarse ni salirse', () => {
  const e = L.crearEstado(7);
  e.proximoPeligro = 99;
  L.paso(e, 0.1, { columna: 5, limpiar: false });
  assert.ok(e.x > 1 && e.x < 2);
  for (let i = 0; i < 10; i++) L.paso(e, 0.1, { columna: 5, limpiar: false });
  assert.equal(e.x, 2);
});

test('no limpia mientras el andamio se mueve', () => {
  const e = L.crearEstado(7);
  e.proximoPeligro = 99;
  const antes = [...e.vidrios];
  L.paso(e, 0.1, { columna: 0, limpiar: true });
  assert.deepEqual(e.vidrios, antes);
});

test('dejar los tres vidrios limpios sube de piso y suma puntos', () => {
  const e = L.crearEstado(7);
  e.vidrios = [0, 0, 1];
  e.x = 2;
  L.paso(e, 0.1, { columna: null, limpiar: true });
  assert.equal(e.piso, 2);
  assert.ok(e.puntos > 0);
  assert.ok(e.vidrios.every((v) => v > 0));
  assert.equal(e.tiempo, L.CONFIG.tiempoPiso);
});

test('la basura que cae en tu columna quita una vida; esquivada no', () => {
  const e = L.crearEstado(7);
  e.proximoPeligro = 99;
  e.peligros = [{ tipo: 'basura', columna: 1, aviso: 0, y: 0.99 }];
  L.paso(e, 0.1, quieto);
  assert.equal(e.vidas, L.CONFIG.vidas - 1);
  assert.equal(e.peligros.length, 0);

  const f = L.crearEstado(7);
  f.proximoPeligro = 99;
  f.peligros = [{ tipo: 'basura', columna: 0, aviso: 0, y: 0.99 }];
  L.paso(f, 0.1, quieto);
  assert.equal(f.vidas, L.CONFIG.vidas);
});

test('la caca del pájaro ensucia el vidrio aunque la esquives', () => {
  const e = L.crearEstado(7);
  e.proximoPeligro = 99;
  e.vidrios = [0, 50, 50];
  e.peligros = [{ tipo: 'caca', columna: 0, aviso: 0, y: 0.99 }];
  L.paso(e, 0.1, quieto);
  assert.equal(e.vidrios[0], L.CONFIG.suciedadCaca);
  assert.equal(e.vidas, L.CONFIG.vidas);
});

test('durante el aviso el peligro no cae', () => {
  const e = L.crearEstado(7);
  e.proximoPeligro = 99;
  e.peligros = [{ tipo: 'basura', columna: 1, aviso: 0.5, y: 0 }];
  L.paso(e, 0.2, quieto);
  assert.equal(e.peligros[0].y, 0);
});

test('tras un golpe hay un segundo de invulnerabilidad', () => {
  const e = L.crearEstado(7);
  e.proximoPeligro = 99;
  e.peligros = [
    { tipo: 'basura', columna: 1, aviso: 0, y: 0.99 },
    { tipo: 'basura', columna: 1, aviso: 0, y: 0.99 },
  ];
  L.paso(e, 0.1, quieto);
  assert.equal(e.vidas, L.CONFIG.vidas - 1);
});

test('perder todas las vidas o quedarse sin tiempo termina la partida', () => {
  const e = L.crearEstado(7);
  e.tiempo = 0.05;
  L.paso(e, 0.1, quieto);
  assert.equal(e.fase, 'fin');
  const congelado = JSON.stringify(e);
  L.paso(e, 1, { columna: 0, limpiar: true });
  assert.equal(JSON.stringify(e), congelado);

  const f = L.crearEstado(7);
  f.proximoPeligro = 99;
  f.vidas = 1;
  f.peligros = [{ tipo: 'basura', columna: 1, aviso: 0, y: 0.99 }];
  L.paso(f, 0.1, quieto);
  assert.equal(f.fase, 'fin');
});

test('con la misma semilla la partida es idéntica y los peligros aparecen', () => {
  const a = L.crearEstado(42);
  const b = L.crearEstado(42);
  for (let i = 0; i < 100; i++) {
    L.paso(a, 0.05, quieto);
    L.paso(b, 0.05, quieto);
  }
  assert.deepEqual(a, b);
  assert.ok(a.peligros.length > 0 || a.vidas < L.CONFIG.vidas || a.vidrios.some((v) => v > 0));
  assert.ok(L.intervaloPeligros(20) >= 0.7);
});
