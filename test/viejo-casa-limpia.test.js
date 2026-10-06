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
  assert.ok(e.problemas.casa < antes.casa);
  assert.ok(e.problemas.patio > antes.patio);
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
  e.problemas.casa = 1;
  V.paso(e, 1, { zona: null, trabajar: true });
  assert.equal(e.problemas.casa, 0);
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
  assert.ok(e.problemas.patio > e.problemas.casa && e.problemas.patio > e.problemas.vereda);
});

test('el perro suelto se escapa si al llegar ve al viejo en la vereda', () => {
  const e = V.crearEstado(3);
  e.proximoEvento = 99;
  e.y = 2;
  e.eventos = [{ tipo: 'perro', zona: 'vereda', suma: 25, aviso: 1.5, avisoTotal: 3 }];
  V.paso(e, 0.1, quieto);
  assert.equal(e.eventos.length, 0);
  assert.equal(e.perrosEspantados, 1);
  assert.equal(e.recienEspantados.length, 1);
  assert.equal(e.recienCaidos.length, 0);
});

test('el perro suelto no se espanta antes de terminar de entrar', () => {
  const e = V.crearEstado(3);
  e.proximoEvento = 99;
  e.y = 2;
  e.eventos = [{ tipo: 'perro', zona: 'vereda', suma: 25, aviso: 2.9, avisoTotal: 3 }];
  V.paso(e, 0.1, quieto);
  assert.equal(e.eventos.length, 1);
  assert.equal(e.perrosEspantados, 0);
});

test('lo de otra zona no se espanta, y al perro tampoco si el viejo no está en la vereda', () => {
  const e = V.crearEstado(3);
  e.proximoEvento = 99;
  e.y = 2;
  e.eventos = [
    { tipo: 'nietos', zona: 'casa', suma: 22, aviso: 1, avisoTotal: 2 },
    { tipo: 'perro', zona: 'vereda', suma: 25, aviso: 1, avisoTotal: 2 },
  ];
  V.paso(e, 0.1, { zona: null, trabajar: true });
  assert.equal(e.eventos.length, 1);
  assert.equal(e.eventos[0].tipo, 'nietos');

  const f = V.crearEstado(3);
  f.proximoEvento = 99;
  f.y = 2;
  f.y = 1;
  f.eventos = [{ tipo: 'perro', zona: 'vereda', suma: 25, aviso: 1, avisoTotal: 2 }];
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
      e.problemas = { casa: 0, patio: 0, vereda: 0 };
      if (e.eventos.length > antes) {
        const zona = e.eventos[e.eventos.length - 1].zona;
        assert.notEqual(zona, anterior);
        anterior = zona;
      }
    }
  }
});

test('sin perro no hay caca: lo que se ensucia solo no deja objetos', () => {
  const e = V.crearEstado(3);
  e.proximoEvento = 999;
  for (let i = 0; i < 200; i++) V.paso(e, 0.1, quieto);
  assert.equal(e.objetos.vereda.length, 0);
});

test('el perro deja una caca en el lugar donde se agachó y barriendo se levanta', () => {
  const e = V.crearEstado(3);
  e.proximoEvento = 999;
  e.problemas.vereda = 0;
  e.eventos = [{ tipo: 'perro', zona: 'vereda', suma: 25, objeto: 'caca', lugar: 0.4, aviso: 0.05, conDueno: true }];
  V.paso(e, 0.1, quieto);
  assert.deepEqual(e.objetos.vereda, [{ tipo: 'caca', lugar: 0.4 }]);
  e.y = 2;
  for (let i = 0; i < 20; i++) V.paso(e, 0.1, { zona: null, trabajar: true });
  assert.equal(e.objetos.vereda.length, 0);
});

test('si el viejo lo ve, el dueño la levanta: no ensucia y putea una sola vez', () => {
  const e = V.crearEstado(3);
  e.proximoEvento = 999;
  e.y = 2;
  const vereda = e.problemas.vereda;
  e.eventos = [{ tipo: 'perro', zona: 'vereda', suma: 25, objeto: 'caca', lugar: 0.5, aviso: 0.3, avisoTotal: 2.5, conDueno: true }];
  V.paso(e, 0.1, quieto);
  assert.equal(e.recienPuteadas.length, 1);
  assert.equal(e.perrosEspantados, 0);
  V.paso(e, 0.1, quieto);
  assert.equal(e.recienPuteadas.length, 0);
  V.paso(e, 0.2, quieto);
  assert.equal(e.recienLevantadas.length, 1);
  assert.equal(e.recienCaidos.length, 0);
  assert.equal(e.cacasLevantadas, 1);
  assert.equal(e.objetos.vereda.length, 0);
  assert.ok(e.problemas.vereda < vereda + 5);
});

test('si el viejo no está, el dueño se hace el distraído y la caca queda', () => {
  const e = V.crearEstado(3);
  e.proximoEvento = 999;
  e.eventos = [{ tipo: 'perro', zona: 'vereda', suma: 25, objeto: 'caca', lugar: 0.5, aviso: 0.05, avisoTotal: 2.5, conDueno: true }];
  V.paso(e, 0.1, quieto);
  assert.equal(e.recienCaidos.length, 1);
  assert.equal(e.objetos.vereda.length, 1);
});

test('perros sueltos y con dueño se alternan, y el suelto da tiempo de llegar desde el patio', () => {
  const e = V.crearEstado(11);
  const perros = [];
  const vistos = new Set();
  while (perros.length < 6) {
    V.paso(e, 0.05, quieto);
    e.problemas = { patio: 0, casa: 0, vereda: 0 };
    for (const ev of e.eventos) {
      if (ev.tipo === 'perro' && !vistos.has(ev)) { vistos.add(ev); perros.push(ev); }
    }
  }
  for (let i = 1; i < perros.length; i++) assert.notEqual(perros[i].conDueno, perros[i - 1].conDueno);
  const caminataDesdePatio = 2 / V.CONFIG.velocidadViejo;
  assert.ok(V.avisoEspantable(0) > caminataDesdePatio + 0.4);
  assert.ok(V.avisoEspantable(300) < V.avisoEspantable(0));
  assert.equal(V.avisoEspantable(1000), V.CONFIG.espantable.avisoMinimo);
});

test('al pibe que tira basura lo corrés a escobazos si llegás antes de que tire', () => {
  const e = V.crearEstado(3);
  e.proximoEvento = 999;
  e.y = 2;
  e.eventos = [{ tipo: 'pibe', zona: 'vereda', suma: 18, objeto: 'vaso', lugar: 0.3, aviso: 1.5, avisoTotal: 3 }];
  V.paso(e, 0.1, quieto);
  assert.equal(e.pibesCorridos, 1);
  assert.equal(e.perrosEspantados, 0);
  assert.equal(e.recienEspantados.length, 1);
  assert.equal(e.objetos.vereda.length, 0);
});

test('si no llegás, el pibe tira el vaso y queda en la vereda', () => {
  const e = V.crearEstado(3);
  e.proximoEvento = 999;
  e.eventos = [{ tipo: 'pibe', zona: 'vereda', suma: 18, objeto: 'vaso', lugar: 0.3, aviso: 0.05, avisoTotal: 3 }];
  V.paso(e, 0.1, quieto);
  assert.equal(e.pibesCorridos, 0);
  assert.deepEqual(e.objetos.vereda, [{ tipo: 'vaso', lugar: 0.3 }]);
});

test('el pibe da el mismo margen que el perro suelto para llegar', () => {
  const e = V.crearEstado(5);
  e.ultimaZonaEvento = 'casa';
  let pibe = null;
  for (let i = 0; i < 2000 && !pibe; i++) {
    V.paso(e, 0.05, quieto);
    e.problemas = { patio: 0, casa: 0, vereda: 0 };
    pibe = e.eventos.find((ev) => ev.tipo === 'pibe');
  }
  assert.ok(pibe);
  const { avisoInicial, avisoMinimo } = V.CONFIG.espantable;
  assert.ok(pibe.avisoTotal <= avisoInicial && pibe.avisoTotal >= avisoMinimo);
  assert.ok(pibe.avisoTotal > V.CONFIG.avisoEvento);
});

test('si el viejo está en el patio, el vecino se esconde sin tirar la bolsa', () => {
  const e = V.crearEstado(3);
  e.proximoEvento = 999;
  e.y = 0;
  e.eventos = [{ tipo: 'vecino', zona: 'patio', suma: 18, objeto: 'bolsa', lugar: 0.5, aviso: 1.5, avisoTotal: 3 }];
  V.paso(e, 0.1, quieto);
  assert.equal(e.vecinosRetados, 1);
  assert.equal(e.recienEspantados.length, 1);
  assert.equal(e.objetos.patio.length, 0);
});

test('si el viejo no está, el vecino tira la bolsa al patio', () => {
  const e = V.crearEstado(3);
  e.proximoEvento = 999;
  e.eventos = [{ tipo: 'vecino', zona: 'patio', suma: 18, objeto: 'bolsa', lugar: 0.5, aviso: 0.05, avisoTotal: 3 }];
  V.paso(e, 0.1, quieto);
  assert.equal(e.vecinosRetados, 0);
  assert.deepEqual(e.objetos.patio, [{ tipo: 'bolsa', lugar: 0.5 }]);
});

test('si el viejo está en la casa, los nietos se sacan las zapatillas y no embarran', () => {
  const e = V.crearEstado(3);
  e.proximoEvento = 999;
  const casa = e.problemas.casa;
  e.eventos = [{ tipo: 'nietos', zona: 'casa', suma: 22, objeto: null, lugar: 0.5, aviso: 1.5, avisoTotal: 3 }];
  V.paso(e, 0.1, quieto);
  assert.equal(e.zapatillasAfuera, 1);
  assert.equal(e.recienEspantados.length, 1);
  assert.ok(e.problemas.casa < casa + 1);
});

test('si el viejo no está en la casa, los nietos embarran', () => {
  const e = V.crearEstado(3);
  e.proximoEvento = 999;
  e.y = 0;
  const casa = e.problemas.casa;
  e.eventos = [{ tipo: 'nietos', zona: 'casa', suma: 22, objeto: null, lugar: 0.5, aviso: 0.05, avisoTotal: 3 }];
  V.paso(e, 0.1, quieto);
  assert.equal(e.zapatillasAfuera, 0);
  assert.ok(e.problemas.casa >= casa + 22);
});
