// Balance de El Viejo y su Casa Limpia medido con un bot que juega como una persona:
// reacciona 0.5 s después de que aparece algo y va a lo más urgente.
const test = require('node:test');
const assert = require('node:assert/strict');
const V = require('../juegos/viejo-casa-limpia/logica.js');

function jugar(semilla) {
  const e = V.crearEstado(semilla);
  const visto = new Map();
  let zona = 1;
  let eventos = 0;
  let frenados = 0;
  while (e.fase === 'jugando' && e.segundos < 180) {
    for (const ev of e.eventos) if (!visto.has(ev)) { visto.set(ev, e.segundos); eventos++; }
    const urgentes = e.eventos.filter((ev) => e.segundos - visto.get(ev) > 0.5).sort((a, b) => a.aviso - b.aviso);
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

test('un buen jugador dura alrededor de un minuto y no frena todo', () => {
  const partidas = Array.from({ length: 80 }, (_, i) => jugar((i + 1) * 104729));
  const duraciones = partidas.map((p) => p.segundos).sort((a, b) => a - b);
  const mediana = duraciones[40];
  const frenados = partidas.reduce((s, p) => s + p.frenados, 0) / partidas.reduce((s, p) => s + p.eventos, 0);
  assert.ok(mediana > 35 && mediana < 70, `mediana ${mediana.toFixed(1)} s`);
  assert.ok(frenados > 0.45 && frenados < 0.75, `frenados ${(frenados * 100).toFixed(0)}%`);
});
