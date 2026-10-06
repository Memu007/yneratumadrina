// Utilidades compartidas por los juegos: lienzo vertical 9:16, bucle y récord.
(function (root) {
  const ANCHO = 360;
  const ALTO = 640;

  function crearLienzo(canvas) {
    const ctx = canvas.getContext('2d');
    function ajustar() {
      const escala = Math.min(window.innerWidth / ANCHO, window.innerHeight / ALTO);
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = ANCHO * escala + 'px';
      canvas.style.height = ALTO * escala + 'px';
      canvas.width = Math.round(ANCHO * escala * dpr);
      canvas.height = Math.round(ALTO * escala * dpr);
      ctx.setTransform(escala * dpr, 0, 0, escala * dpr, 0, 0);
    }
    window.addEventListener('resize', ajustar);
    ajustar();
    return ctx;
  }

  // Convierte un evento de puntero a coordenadas lógicas del juego.
  function puntoLogico(canvas, evento) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((evento.clientX - r.left) / r.width) * ANCHO,
      y: ((evento.clientY - r.top) / r.height) * ALTO,
    };
  }

  function bucle(paso) {
    let previo = performance.now();
    function cuadro(ahora) {
      // Limita dt para que volver de otra pestaña no salte el juego.
      const dt = Math.min((ahora - previo) / 1000, 0.05);
      previo = ahora;
      paso(dt);
      requestAnimationFrame(cuadro);
    }
    requestAnimationFrame(cuadro);
  }

  function leerRecord(clave) {
    try {
      return Number(localStorage.getItem(clave)) || 0;
    } catch {
      return 0;
    }
  }

  function guardarRecord(clave, valor) {
    const actual = leerRecord(clave);
    if (valor <= actual) return actual;
    try {
      localStorage.setItem(clave, String(valor));
    } catch {
      // Sin almacenamiento (modo privado): el récord vale solo por esta partida.
    }
    return valor;
  }

  function textoCentrado(ctx, texto, y, tam, color) {
    ctx.fillStyle = color || '#111';
    ctx.font = `bold ${tam}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(texto, ANCHO / 2, y);
  }

  root.Lienzo = { ANCHO, ALTO, crearLienzo, puntoLogico, bucle, leerRecord, guardarRecord, textoCentrado };
})(globalThis);
