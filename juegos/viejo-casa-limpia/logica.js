// Lógica pura de El Viejo y su Casa Limpia. Sin DOM: se prueba con `node --test`.
(function (root) {
  // Zonas de arriba hacia abajo en la pantalla.
  const ZONAS = ['casa', 'jardin', 'vereda'];
  const CONFIG = {
    velocidadViejo: 0.9, // zonas por segundo: el viejo es lento a propósito
    velocidadTrabajo: 30, // problema quitado por segundo
    // Cuánto empeora cada zona por segundo al comienzo.
    deterioro: { casa: 2, jardin: 3, vereda: 1.2 },
    rampa: 90, // cada 90 s el deterioro se duplica
    avisoEvento: 1.5,
  };
  const EVENTOS = [
    { tipo: 'perro', zona: 'vereda', suma: 25 },
    { tipo: 'vecino', zona: 'vereda', suma: 18 },
    { tipo: 'vecino', zona: 'jardin', suma: 18 },
    { tipo: 'nietos', zona: 'casa', suma: 22 },
  ];

  function aleatorio(estado) {
    let s = estado.semilla;
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    estado.semilla = s >>> 0;
    return estado.semilla / 4294967296;
  }

  function crearEstado(semilla) {
    return {
      semilla: semilla >>> 0 || 1,
      fase: 'jugando',
      segundos: 0,
      y: 1, // posición del viejo en zonas (0..2)
      problemas: { casa: 20, jardin: 20, vereda: 20 }, // 100 = perdiste
      eventos: [],
      proximoEvento: 4,
      perdioPor: null,
    };
  }

  function zonaActual(estado) {
    return Math.round(estado.y);
  }

  function multiplicador(segundos) {
    return 1 + segundos / CONFIG.rampa;
  }

  function intervaloEventos(segundos) {
    return Math.max(1.5, 6 - segundos / 20);
  }

  // entrada: { zona: 0..2 | null, trabajar: boolean }
  function paso(estado, dt, entrada) {
    if (estado.fase !== 'jugando') return estado;
    estado.segundos += dt;

    if (entrada.zona !== null && entrada.zona !== undefined) {
      const destino = Math.max(0, Math.min(ZONAS.length - 1, entrada.zona));
      const delta = destino - estado.y;
      const avance = CONFIG.velocidadViejo * dt;
      estado.y = Math.abs(delta) <= avance ? destino : estado.y + Math.sign(delta) * avance;
    }

    const m = multiplicador(estado.segundos);
    for (const zona of ZONAS) {
      estado.problemas[zona] += CONFIG.deterioro[zona] * m * dt;
    }

    const quieto = Math.abs(estado.y - zonaActual(estado)) < 0.05;
    if (entrada.trabajar && quieto) {
      const zona = ZONAS[zonaActual(estado)];
      estado.problemas[zona] -= CONFIG.velocidadTrabajo * dt;
    }

    estado.proximoEvento -= dt;
    if (estado.proximoEvento <= 0) {
      const e = EVENTOS[Math.floor(aleatorio(estado) * EVENTOS.length)];
      estado.eventos.push({ ...e, aviso: CONFIG.avisoEvento });
      estado.proximoEvento = intervaloEventos(estado.segundos);
    }

    const pendientes = [];
    for (const e of estado.eventos) {
      e.aviso -= dt;
      if (e.aviso <= 0) estado.problemas[e.zona] += e.suma;
      else pendientes.push(e);
    }
    estado.eventos = pendientes;

    for (const zona of ZONAS) {
      estado.problemas[zona] = Math.max(0, estado.problemas[zona]);
      if (estado.problemas[zona] >= 100 && estado.fase === 'jugando') {
        estado.problemas[zona] = 100;
        estado.fase = 'fin';
        estado.perdioPor = zona;
      }
    }
    return estado;
  }

  const api = { ZONAS, CONFIG, EVENTOS, crearEstado, paso, zonaActual, intervaloEventos };
  if (typeof module !== 'undefined') module.exports = api;
  else root.ViejoCasaLimpia = api;
})(globalThis);
