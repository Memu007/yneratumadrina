// Las pantallas leen ajustes de la lógica (V.CONFIG.x). Si un ajuste cambia de nombre y la
// pantalla queda con el viejo, el juego se traba en pleno partido: esta prueba lo atrapa.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const JUEGOS = [
  { carpeta: 'viejo-casa-limpia', alias: 'V' },
  { carpeta: 'limpiavidrios', alias: 'L' },
];

for (const { carpeta, alias } of JUEGOS) {
  test(`${carpeta}: la pantalla solo usa ajustes y funciones que existen en la lógica`, () => {
    const dir = path.join(__dirname, '..', 'juegos', carpeta);
    const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
    const logica = require(path.join(dir, 'logica.js'));
    for (const [, clave] of html.matchAll(new RegExp(`\\b${alias}\\.CONFIG\\.(\\w+)`, 'g'))) {
      assert.ok(clave in logica.CONFIG, `${alias}.CONFIG.${clave} no existe`);
    }
    for (const [, nombre] of html.matchAll(new RegExp(`\\b${alias}\\.(\\w+)`, 'g'))) {
      assert.ok(nombre in logica, `${alias}.${nombre} no existe`);
    }
  });
}
