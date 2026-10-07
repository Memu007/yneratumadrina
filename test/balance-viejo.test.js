// Balance de El Viejo y su Casa Limpia medido con bots que juegan como personas:
// reaccionan un rato después de que aparece algo y van a lo más urgente.
const test = require('node:test');
const assert = require('node:assert/strict');
const V = require('../juegos/viejo-casa-limpia/logica.js');

function jugar(semilla, reaccion) {
  const e = V.crearEstado(semilla);
  const visto = new Map();
  let zona = 1;
  let eventos = 0;
  let frenados = 0;
  while (e.fase === 'jugando' && e.segundos < 180) {
    for (const ev of e.eventos) if (!visto.has(ev)) { visto.set(ev, e.segundos); eventos++; }
    const urgentes = e.eventos.filter((ev) => e.segundos - visto.get(ev) > reaccion).sort((a, b) => a.aviso - b.aviso);
    if (urgentes.length) {
      zona = V.ZONAS.indexOf(urgentes[0].zona);
    } else {
      const peor = V.ZONAS.reduce((a, z) => (e.problemas[z] > e.problemas[a] ? z : a));
      if (e.problemas[peor] > e.problemas[V.ZONAS[zona]] + 15) zona = V.ZONAS.indexOf(peor);
    }
    V.paso(e, 1 / 30, { zona, trabajar: true });
    frenados += e.recienEspantados.length + e.recienLevantadas.length;
  }
  return { segundos: e.segundos, eventos, frenados };
}

// Jugador que rota patio → casa → vereda cada `periodo` segundos sin mirar nada.
function rotar(semilla, periodo) {
  const e = V.crearEstado(semilla);
  while (e.fase === 'jugando' && e.segundos < 180) {
    V.paso(e, 1 / 30, { zona: Math.floor(e.segundos / periodo) % 3, trabajar: true });
  }
  return e.segundos;
}

function mediana(valores) {
  const orden = [...valores].sort((a, b) => a - b);
  return orden[Math.floor(orden.length / 2)];
}

function medir(reaccion) {
  const partidas = Array.from({ length: 80 }, (_, i) => jugar((i + 1) * 104729, reaccion));
  const duraciones = partidas.map((p) => p.segundos).sort((a, b) => a - b);
  const frenados = partidas.reduce((s, p) => s + p.frenados, 0) / partidas.reduce((s, p) => s + p.eventos, 0);
  return { mediana: duraciones[40], frenados };
}

test('alguien que recién empieza (reacciona en 1 s) dura un minuto y frena más de la mitad', () => {
  const { mediana, frenados } = medir(1);
  assert.ok(mediana > 40 && mediana < 70, `mediana ${mediana.toFixed(1)} s`);
  assert.ok(frenados > 0.5 && frenados < 0.75, `frenados ${(frenados * 100).toFixed(0)}%`);
});

test('un jugador rápido (0.5 s) no frena todo: el juego sigue teniendo desafío', () => {
  const { frenados } = medir(0.5);
  assert.ok(frenados < 0.8, `frenados ${(frenados * 100).toFixed(0)}%`);
});

test('mirar rinde: rotar sin mirar dura mucho menos que jugar atento', () => {
  const atento = medir(1).mediana;
  for (const periodo of [3, 4, 6]) {
    const rotando = mediana(Array.from({ length: 60 }, (_, i) => rotar((i + 1) * 7919, periodo)));
    assert.ok(rotando < 0.6 * atento, `rotando cada ${periodo} s dura ${rotando.toFixed(1)} s; atento ${atento.toFixed(1)} s`);
  }
});

test('nadie aguanta para siempre: ninguna partida atenta pasa de 100 s', () => {
  const partidas = Array.from({ length: 80 }, (_, i) => jugar((i + 1) * 104729, 0.5));
  const maxima = Math.max(...partidas.map((p) => p.segundos));
  assert.ok(maxima < 100, `la más larga duró ${maxima.toFixed(1)} s`);
});
