// Lógica pura del Limpiavidrios. Sin DOM: se prueba con `node --test`.
(function (root) {
  const COLUMNAS = 3;
  const CONFIG = {
    vidas: 3,
    tiempoPiso: 25, // segundos para dejar limpio un piso
    velocidadLimpieza: 55, // suciedad quitada por segundo
    velocidadAndamio: 5, // columnas por segundo
    avisoPeligro: 0.9, // segundos de aviso antes de que caiga algo
    velocidadCaida: 1.3, // recorrido completo por segundo
    suciedadCaca: 35,
  };

  function aleatorio(estado) {
    // xorshift32: determinista con semilla, para pruebas reproducibles.
    let s = estado.semilla;
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    estado.semilla = s >>> 0;
    return estado.semilla / 4294967296;
  }

  function suciedadInicial(estado) {
    const base = Math.min(40 + estado.piso * 6, 90);
    return Array.from({ length: COLUMNAS }, () => Math.round(base + aleatorio(estado) * 10));
  }

  function intervaloPeligros(piso) {
    return Math.max(0.7, 2.6 - piso * 0.2);
  }

  function crearEstado(semilla) {
    const estado = {
      semilla: semilla >>> 0 || 1,
      fase: 'jugando',
      piso: 1,
      puntos: 0,
      vidas: CONFIG.vidas,
      tiempo: CONFIG.tiempoPiso,
      x: 1, // posición del andamio en columnas (0..2)
      vidrios: [],
      peligros: [],
      proximoPeligro: 2,
      golpe: 0, // segundos de parpadeo tras un golpe
    };
    estado.vidrios = suciedadInicial(estado);
    return estado;
  }

  function columnaActual(estado) {
    return Math.round(estado.x);
  }

  function crearPeligro(estado) {
    return {
      tipo: aleatorio(estado) < 0.5 ? 'basura' : 'caca',
      columna: Math.floor(aleatorio(estado) * COLUMNAS),
      aviso: CONFIG.avisoPeligro,
      y: 0, // 0 = arriba de la pantalla, 1 = altura del andamio
    };
  }

  function impactar(estado, peligro) {
    const enColumna = columnaActual(estado) === peligro.columna;
    if (peligro.tipo === 'caca') {
      // La caca ensucia el vidrio aunque el limpiador la esquive.
      estado.vidrios[peligro.columna] = Math.min(100, estado.vidrios[peligro.columna] + CONFIG.suciedadCaca);
    }
    if (enColumna && estado.golpe <= 0) {
      estado.vidas -= 1;
      estado.golpe = 1;
    }
  }

  function subirPiso(estado) {
    estado.puntos += estado.piso * 100 + Math.round(estado.tiempo * 10);
    estado.piso += 1;
    estado.tiempo = CONFIG.tiempoPiso;
    estado.vidrios = suciedadInicial(estado);
    estado.peligros = [];
    estado.proximoPeligro = 1.5;
  }

  // entrada: { columna: 0..2 | null, limpiar: boolean }
  function paso(estado, dt, entrada) {
    if (estado.fase !== 'jugando') return estado;

    if (entrada.columna !== null && entrada.columna !== undefined) {
      const destino = Math.max(0, Math.min(COLUMNAS - 1, entrada.columna));
      const delta = destino - estado.x;
      const avance = CONFIG.velocidadAndamio * dt;
      estado.x = Math.abs(delta) <= avance ? destino : estado.x + Math.sign(delta) * avance;
    }

    const quieto = Math.abs(estado.x - columnaActual(estado)) < 0.05;
    if (entrada.limpiar && quieto) {
      const c = columnaActual(estado);
      estado.vidrios[c] = Math.max(0, estado.vidrios[c] - CONFIG.velocidadLimpieza * dt);
    }

    estado.golpe = Math.max(0, estado.golpe - dt);
    estado.tiempo -= dt;

    estado.proximoPeligro -= dt;
    if (estado.proximoPeligro <= 0) {
      estado.peligros.push(crearPeligro(estado));
      estado.proximoPeligro = intervaloPeligros(estado.piso);
    }

    const restantes = [];
    for (const p of estado.peligros) {
      if (p.aviso > 0) {
        p.aviso -= dt;
      } else {
        p.y += CONFIG.velocidadCaida * dt;
      }
      if (p.y >= 1) impactar(estado, p);
      else restantes.push(p);
    }
    estado.peligros = restantes;

    if (estado.vidas <= 0 || estado.tiempo <= 0) {
      estado.fase = 'fin';
    } else if (estado.vidrios.every((v) => v <= 0)) {
      subirPiso(estado);
    }
    return estado;
  }

  const api = { COLUMNAS, CONFIG, crearEstado, paso, columnaActual, intervaloPeligros };
  if (typeof module !== 'undefined') module.exports = api;
  else root.Limpiavidrios = api;
})(globalThis);
