# Reglas del proyecto

## Producto

- Inera Sara produce juegos chicos y baratos, al ritmo de la moda rápida, para difundir en TikTok e Instagram.
- Cada juego: una mecánica, partidas de un minuto, formato vertical 9:16, se entiende en 3 segundos.
- No ampliar alcance por iniciativa propia. Si una decisión cambia producto, costo, privacidad o riesgo, detenerse y consultarla.

## Código

- HTML, CSS y JavaScript puros. Sin build, sin frameworks, sin dependencias de ejecución.
- Cada juego vive en `juegos/<nombre>/` con `logica.js` (reglas puras, sin DOM) e `index.html` (dibujo y controles).
- Lo compartido entre juegos va en `comun/` solo si lo usan al menos dos juegos.
- Toda regla del juego (puntaje, vidas, eventos, fin de partida) debe tener una prueba en `test/`.
- Los juegos deben funcionar abriendo el archivo con doble clic y en celular.
- `localStorage` solo para récords y siempre con try/catch.

## Costos

- No incorporar servicios pagos, analytics externos, anuncios, pagos ni nuevas dependencias sin aprobación.
- No recolectar datos personales de jugadores.

## Git

- Una rama y PR por juego o cambio.
- Commits pequeños y deliberados.
- Nunca incluir secretos ni archivos de entorno.
- Ejecutar `npm test` antes de entregar.
