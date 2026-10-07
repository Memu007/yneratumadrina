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
- Commits pequeños y deliberados; el cambio de juego y sus pruebas, en commits separados.
- Nunca incluir secretos ni archivos de entorno.
- Ejecutar `npm test` antes de entregar.

## Cómo se trabaja

Adaptado del método [ynerasecondbrain](https://github.com/Memu007/ynerasecondbrain)
para una sola sesión que hace de PM y de Dev, con el dueño en el teléfono.
Lo que no está acá (canales entre sesiones, rutinas, varias Devs, producción,
dinero) no aplica mientras el proyecto no lo tenga.

**Verificar y dar evidencia**
- Comprobar la premisa de cada pedido; si choca con el producto, el costo o
  lo ya decidido, decirlo antes de hacerlo, con costo y alternativa.
- Lo que no se corrió se declara como no corrido.
- Una prueba nueva tiene que poder ponerse roja: se rompe a propósito lo que
  cuida y se comprueba que falla por el motivo correcto.
- Un rojo se diagnostica; no se repite hasta que pase.
- Los cambios de dificultad se miden con el bot de `test/balance-viejo.test.js`
  antes y después; no a ojo.

**Antes de publicar una versión** (link privado o público)
- `npm test` completo, más una partida automática en el navegador con toques
  al azar, derrotas y reinicios, sin errores en consola.
- Releer el diff completo y retirar lo que no se pidió.
- Nada público sin el «dale» escrito del dueño.

**Subagentes**
- Arrancan con contexto nuevo y devuelven solo su conclusión. Lo que
  encuentran es una hipótesis: se reproduce antes de arreglarlo o contarlo.
- Para revisar un juego o un cambio visual: Sonnet, esfuerzo medio o alto,
  con la consigna «buscá cómo esto se traba, se cuelga, pierde el récord o
  queda injusto en el celular».
- Para tareas mecánicas (buscar, correr pruebas largas, capturas): Haiku.
  Haiku nunca revisa: un «no encontré nada» de Haiku no prueba nada.
- Se elige lo menor que alcance.
- Fable solo como consejero en los momentos caros (antes de publicar en
  público, antes de cambiar una regla o cuando algo no cierra) y solo si el
  dueño lo habilitó.
- Cada revisión de subagente deja una fila en `docs/MEDICION.md`.

**Informar al dueño**
- Arriba, el resultado y lo que tiene que decidir; las decisiones numeradas
  (D1, D2…), cada una con opciones cerradas y una recomendación.
- Al ~60 % de contexto, darle al dueño el `/compact conservar: …` listo para
  pegar, con el estado ya subido al repositorio.
