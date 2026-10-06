// Lógica pura de El Viejo y su Casa Limpia. Sin DOM: se prueba con `node --test`.
(function (root) {
  // Zonas de arriba hacia abajo: patio de atrás, casa, jardín de adelante con la vereda.
  const ZONAS = ['patio', 'casa', 'vereda'];
  const CONFIG = {
    velocidadViejo: 0.9, // zonas por segundo: el viejo es lento a propósito
    velocidadTrabajo: 30, // problema quitado por segundo
    // Cuánto empeora cada zona por segundo al comienzo.
    deterioro: { patio: 3, casa: 2, vereda: 1.2 },
    rampa: 75, // el deterioro suma su valor base cada 75 s (crecimiento lineal)
    avisoEvento: 2,
    // Perro suelto: el aviso alcanza para reaccionar (~0.4 s) y caminar desde el patio
    // hasta la vereda (2.2 s). Con el tiempo se acorta y desde el patio ya no se llega.
    perroSolo: { avisoInicial: 3, avisoMinimo: 2, rampa: 90, llegada: 0.35 },
    avisoPerroDueno: 2.5,
    unidadMugre: 8, // cada 8 puntos de problema entra un objeto tirado en la zona
    intervaloMinimo: 2.5,
    sinRepetirHasta: 60, // antes de esto, dos eventos seguidos nunca caen en la misma zona
    // El pasto alto en la primera imagen enseña qué hacer sin tutorial.
    inicio: { patio: 55, casa: 35, vereda: 20 },
  };
  // `objeto` es lo que queda tirado en la zona; sin perro no hay caca.
  // `peso`: qué tan seguido sale cada evento; el perro es la estrella.
  const EVENTOS = [
    { tipo: 'perro', zona: 'vereda', suma: 25, objeto: 'caca', peso: 2 },
    { tipo: 'vecino', zona: 'vereda', suma: 18, objeto: 'vaso', peso: 1 },
    { tipo: 'vecino', zona: 'patio', suma: 18, objeto: 'bolsa', peso: 1.5 },
    { tipo: 'nietos', zona: 'casa', suma: 22, objeto: null, peso: 1.5 },
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
      y: 1, // posición del viejo en zonas (0..2); arranca en la casa
      problemas: { ...CONFIG.inicio }, // 100 = perdiste
      eventos: [],
      proximoEvento: 4,
      ultimaZonaEvento: null,
      perdioPor: null,
      perrosEspantados: 0,
      cacasLevantadas: 0, // las que levantó el dueño porque lo vio el viejo
      proximoPerroConDueno: null, // se sortea con el primer perro y después se alterna
      objetos: { patio: [], casa: [], vereda: [] }, // lo que quedó tirado, del más viejo al más nuevo
      // Lo ocurrido en el último paso, para que la pantalla reaccione (sonido, sacudón).
      recienCaidos: [],
      recienEspantados: [],
      recienPuteadas: [],
      recienLevantadas: [],
    };
  }

  function zonaActual(estado) {
    return Math.round(estado.y);
  }

  function multiplicador(segundos) {
    return 1 + segundos / CONFIG.rampa;
  }

  function intervaloEventos(segundos) {
    return Math.max(CONFIG.intervaloMinimo, 6 - segundos / 20);
  }

  function elegirEvento(estado) {
    const candidatos =
      estado.segundos < CONFIG.sinRepetirHasta
        ? EVENTOS.filter((e) => e.zona !== estado.ultimaZonaEvento)
        : EVENTOS;
    let tirada = aleatorio(estado) * candidatos.reduce((suma, e) => suma + e.peso, 0);
    for (const e of candidatos) {
      tirada -= e.peso;
      if (tirada < 0) return e;
    }
    return candidatos[candidatos.length - 1];
  }

  function avisoPerroSolo(segundos) {
    const { avisoInicial, avisoMinimo, rampa } = CONFIG.perroSolo;
    return Math.max(avisoMinimo, avisoInicial - segundos / rampa);
  }

  function crearEvento(estado) {
    const base = elegirEvento(estado);
    const e = { ...base, lugar: aleatorio(estado), testigo: false };
    if (e.tipo === 'perro') {
      // Se alternan suelto y con dueño para que en cada partida se vean los dos.
      if (estado.proximoPerroConDueno === null) estado.proximoPerroConDueno = aleatorio(estado) < 0.5;
      e.conDueno = estado.proximoPerroConDueno;
      estado.proximoPerroConDueno = !e.conDueno;
      e.aviso = e.conDueno ? CONFIG.avisoPerroDueno : avisoPerroSolo(estado.segundos);
    } else {
      e.aviso = CONFIG.avisoEvento;
    }
    e.avisoTotal = e.aviso;
    return e;
  }

  // entrada: { zona: 0..2 | null, trabajar: boolean }
  function paso(estado, dt, entrada) {
    estado.recienCaidos = [];
    estado.recienEspantados = [];
    estado.recienPuteadas = [];
    estado.recienLevantadas = [];
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
    const trabajando = entrada.trabajar && quieto;
    const zonaViejo = ZONAS[zonaActual(estado)];
    if (trabajando) {
      estado.problemas[zonaViejo] -= CONFIG.velocidadTrabajo * dt;
    }

    estado.proximoEvento -= dt;
    if (estado.proximoEvento <= 0) {
      const e = crearEvento(estado);
      estado.eventos.push(e);
      estado.ultimaZonaEvento = e.zona;
      estado.proximoEvento = intervaloEventos(estado.segundos);
    }

    const pendientes = [];
    for (const e of estado.eventos) {
      const viejoAhi = quieto && zonaViejo === e.zona;
      const llego = 1 - e.aviso / e.avisoTotal >= CONFIG.perroSolo.llegada;
      if (e.tipo === 'perro' && !e.conDueno && viejoAhi && llego) {
        // Si el perro suelto llega y ve al viejo en la vereda, sale rajando sin hacer nada.
        estado.perrosEspantados += 1;
        estado.recienEspantados.push(e);
        continue;
      }
      if (e.tipo === 'perro' && e.conDueno && viejoAhi && !e.testigo) {
        // Con dueño no se espanta: el dueño se siente vigilado y va a tener que levantarla.
        e.testigo = true;
        estado.recienPuteadas.push(e);
      }
      e.aviso -= dt;
      if (e.aviso <= 0 && e.testigo) {
        // El perro cagó, pero el dueño, avergonzado, la levanta y se va puteando.
        estado.cacasLevantadas += 1;
        estado.recienLevantadas.push(e);
      } else if (e.aviso <= 0) {
        estado.problemas[e.zona] += e.suma;
        if (e.objeto) estado.objetos[e.zona].push({ tipo: e.objeto, lugar: e.lugar });
        estado.recienCaidos.push(e);
      } else {
        pendientes.push(e);
      }
    }
    estado.eventos = pendientes;

    for (const zona of ZONAS) {
      estado.problemas[zona] = Math.max(0, estado.problemas[zona]);
      // Al limpiar se levanta primero lo más viejo.
      const capacidad = Math.floor(estado.problemas[zona] / CONFIG.unidadMugre);
      while (estado.objetos[zona].length > capacidad) estado.objetos[zona].shift();
      if (estado.problemas[zona] >= 100 && estado.fase === 'jugando') {
        estado.problemas[zona] = 100;
        estado.fase = 'fin';
        estado.perdioPor = zona;
      }
    }
    return estado;
  }

  const api = { ZONAS, CONFIG, EVENTOS, crearEstado, paso, zonaActual, intervaloEventos, avisoPerroSolo };
  if (typeof module !== 'undefined') module.exports = api;
  else root.ViejoCasaLimpia = api;
})(globalThis);
