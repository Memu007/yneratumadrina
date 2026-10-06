const test = require('node:test');
const assert = require('node:assert/strict');
const V = require('../juegos/viejo-casa-limpia/logica.js');

const quieto = { zona: null, trabajar: false };

test('todas las zonas empeoran solas con el tiempo', () => {
  const e = V.crearEstado(3);
  e.proximoEvento = 99;
  const antes = { ...e.problemas };
  V.paso(e, 1, quieto);
  for (const z of V.ZONAS) assert.ok(e.problemas[z] > antes[z], z);
});

test('trabajar mejora solo la zona donde está el viejo', () => {
  const e = V.crearEstado(3);
  e.proximoEvento = 99;
  const antes = { ...e.problemas };
  V.paso(e, 0.5, { zona: null, trabajar: true });
  assert.ok(e.problemas.jardin < antes.jardin);
  assert.ok(e.problemas.casa > antes.casa);
  assert.ok(e.problemas.vereda > antes.vereda);
});

test('el viejo camina lento y no trabaja mientras camina', () => {
  const e = V.crearEstado(3);
  e.proximoEvento = 99;
  const casaAntes = e.problemas.casa;
  V.paso(e, 0.3, { zona: 0, trabajar: true });
  assert.ok(e.y < 1 && e.y > 0);
  assert.ok(e.problemas.casa > casaAntes);
  for (let i = 0; i < 20; i++) V.paso(e, 0.1, { zona: -3, trabajar: false });
  assert.equal(e.y, 0);
});

test('los problemas nunca bajan de cero', () => {
  const e = V.crearEstado(3);
  e.proximoEvento = 99;
  e.problemas.jardin = 1;
  V.paso(e, 1, { zona: null, trabajar: true });
  assert.equal(e.problemas.jardin, 0);
});

test('el perro deja su regalo en la vereda cuando termina el aviso', () => {
  const e = V.crearEstado(3);
  e.proximoEvento = 99;
  e.eventos = [{ tipo: 'perro', zona: 'vereda', suma: 25, aviso: 0.5 }];
  V.paso(e, 0.2, quieto);
  assert.ok(e.problemas.vereda < 25);
  V.paso(e, 0.4, quieto);
  assert.ok(e.problemas.vereda > 40);
  assert.equal(e.eventos.length, 0);
});

test('una zona al 100% termina la partida e indica la causa', () => {
  const e = V.crearEstado(3);
  e.proximoEvento = 99;
  e.problemas.casa = 99.9;
  V.paso(e, 0.5, quieto);
  assert.equal(e.fase, 'fin');
  assert.equal(e.perdioPor, 'casa');
  assert.equal(e.problemas.casa, 100);
  const segundos = e.segundos;
  V.paso(e, 1, quieto);
  assert.equal(e.segundos, segundos);
});

test('aparecen eventos, se acelera y es reproducible con la misma semilla', () => {
  const a = V.crearEstado(9);
  const b = V.crearEstado(9);
  let vistos = 0;
  for (let i = 0; i < 100; i++) {
    V.paso(a, 0.05, quieto);
    V.paso(b, 0.05, quieto);
    vistos += a.eventos.length;
  }
  assert.deepEqual(a, b);
  assert.ok(vistos > 0);
  assert.ok(V.intervaloEventos(300) < V.intervaloEventos(0));
  assert.equal(V.intervaloEventos(1000), V.CONFIG.intervaloMinimo);
});

test('arranca con el pasto alto para que se entienda qué hacer', () => {
  const e = V.crearEstado(3);
  assert.ok(e.problemas.jardin > e.problemas.casa && e.problemas.jardin > e.problemas.vereda);
});

test('el viejo trabajando en la vereda espanta al perro antes de que cague', () => {
  const e = V.crearEstado(3);
  e.proximoEvento = 99;
  e.y = 2;
  e.eventos = [{ tipo: 'perro', zona: 'vereda', suma: 25, aviso: 1 }];
  V.paso(e, 0.1, { zona: null, trabajar: true });
  assert.equal(e.eventos.length, 0);
  assert.equal(e.perrosEspantados, 1);
  assert.equal(e.recienEspantados.length, 1);
  assert.equal(e.recienCaidos.length, 0);
});

test('al vecino no se lo espanta, y al perro tampoco si el viejo no trabaja', () => {
  const e = V.crearEstado(3);
  e.proximoEvento = 99;
  e.y = 2;
  e.eventos = [
    { tipo: 'vecino', zona: 'vereda', suma: 18, aviso: 1 },
    { tipo: 'perro', zona: 'vereda', suma: 25, aviso: 1 },
  ];
  V.paso(e, 0.1, { zona: null, trabajar: true });
  assert.equal(e.eventos.length, 1);
  assert.equal(e.eventos[0].tipo, 'vecino');

  const f = V.crearEstado(3);
  f.proximoEvento = 99;
  f.y = 2;
  f.eventos = [{ tipo: 'perro', zona: 'vereda', suma: 25, aviso: 1 }];
  V.paso(f, 0.1, quieto);
  assert.equal(f.eventos.length, 1);
});

test('lo que cae queda informado solo durante ese paso', () => {
  const e = V.crearEstado(3);
  e.proximoEvento = 99;
  e.eventos = [{ tipo: 'nietos', zona: 'casa', suma: 22, aviso: 0.05 }];
  V.paso(e, 0.1, quieto);
  assert.equal(e.recienCaidos.length, 1);
  V.paso(e, 0.1, quieto);
  assert.equal(e.recienCaidos.length, 0);
});

test('antes del minuto nunca caen dos eventos seguidos en la misma zona', () => {
  for (let semilla = 1; semilla <= 30; semilla++) {
    const e = V.crearEstado(semilla);
    let anterior = null;
    while (e.segundos < 59 && e.fase === 'jugando') {
      const antes = e.eventos.length;
      V.paso(e, 0.05, { zona: null, trabajar: true });
      e.problemas = { casa: 0, jardin: 0, vereda: 0 };
      if (e.eventos.length > antes) {
        const zona = e.eventos[e.eventos.length - 1].zona;
        assert.notEqual(zona, anterior);
        anterior = zona;
      }
    }
  }
});
