/* ==========================================================================
   SONIDO
   1) «Tú y yo» (La Misma Gente), nuestra canción: se reproduce desde un
      archivo autorizado que tú subes (ver CALENDARIO.cancion en config.js).
      Pasa por Web Audio para poder hacer fundidos y bajar el volumen en
      iPhone, donde Safari no permite cambiar el volumen de un <audio>.
   2) Caja de música de respaldo: «Noche de paz» (Gruber, 1818, dominio
      público) generada en el navegador. Suena solo si no hay canción.
   3) Efectos suaves al abrir puertas, cartas y regalos.
   El audio solo empieza después de un toque (regla de los navegadores).
   ========================================================================== */
(function () {
  "use strict";

  const CFG = window.CALENDARIO || {};
  const CANCION = CFG.cancion || {};
  const CLAVE = "adri-sonido";
  let pref = { cancion: true, musica: false, volumen: 0.8, silencio: false };
  try { Object.assign(pref, JSON.parse(localStorage.getItem(CLAVE) || "{}")); } catch (e) {}
  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(pref)); } catch (e) {} };

  let ctx = null, maestro = null, busMusica = null, busFx = null, reverb = null;
  const oyentes = new Set();

  function crearContexto() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    maestro = ctx.createGain();
    maestro.gain.value = pref.silencio ? 0 : pref.volumen;
    maestro.connect(ctx.destination);

    reverb = ctx.createConvolver();
    const largo = Math.floor(ctx.sampleRate * 2.4), ir = ctx.createBuffer(2, largo, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < largo; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / largo, 3);
    }
    reverb.buffer = ir;
    const mojado = ctx.createGain(); mojado.gain.value = 0.32;
    reverb.connect(mojado); mojado.connect(maestro);

    busMusica = ctx.createGain(); busMusica.gain.value = 0.0001;
    busMusica.connect(maestro); busMusica.connect(reverb);
    busFx = ctx.createGain(); busFx.gain.value = 0.5;
    busFx.connect(maestro); busFx.connect(reverb);
    return ctx;
  }

  function despertar() {
    crearContexto();
    if (ctx && ctx.state !== "running") ctx.resume().catch(() => {});
  }

  function rampa(param, valor, segundos) {
    const t = ctx.currentTime;
    param.cancelScheduledValues(t);
    param.setValueAtTime(Math.max(0.0001, param.value), t);
    param.linearRampToValueAtTime(Math.max(0.0001, valor), t + segundos);
  }

  /* ====================================================================
     NUESTRA CANCIÓN
     ==================================================================== */
  const cancion = {
    el: null, fuente: null, ganancia: null,
    disponible: null,          // null = comprobando, true / false
    sonando: false, atenuada: false, protagonista: false
  };

  if (CANCION.archivo) {
    const a = new Audio();
    a.preload = "metadata";
    a.loop = true;
    a.setAttribute("playsinline", "");
    a.src = CANCION.archivo;
    a.addEventListener("loadedmetadata", () => { cancion.disponible = true; avisar(); });
    a.addEventListener("error", () => { cancion.disponible = false; avisar(); });
    a.addEventListener("play", () => { cancion.sonando = true; avisar(); });
    a.addEventListener("pause", () => { cancion.sonando = false; avisar(); });
    a.addEventListener("timeupdate", () => oyentesTiempo.forEach(fn => fn(a.currentTime, a.duration)));
    cancion.el = a;
  } else cancion.disponible = false;
  const oyentesTiempo = new Set();

  function conectarCancion() {
    if (!cancion.el || cancion.fuente || !crearContexto()) return;
    try {
      cancion.fuente = ctx.createMediaElementSource(cancion.el);
      cancion.ganancia = ctx.createGain();
      cancion.ganancia.gain.value = 0.0001;
      cancion.fuente.connect(cancion.ganancia);
      cancion.ganancia.connect(maestro);
    } catch (e) { cancion.fuente = null; }
  }

  function nivelCancion() { return cancion.atenuada ? 0.16 : 1; }

  function reproducirCancion(opciones) {
    const o = opciones || {};
    if (!cancion.el || cancion.disponible === false) return false;
    despertar();
    conectarCancion();
    if (tocandoCaja) detenerCaja();
    if (typeof o.desde === "number") { try { cancion.el.currentTime = o.desde; } catch (e) {} }
    cancion.protagonista = !!o.protagonista;
    pref.cancion = true; guardar();
    const p = cancion.el.play();
    if (cancion.ganancia) rampa(cancion.ganancia.gain, nivelCancion(), o.fundido || 2.5);
    else cancion.el.volume = pref.silencio ? 0 : pref.volumen;
    if (p && p.catch) p.catch(() => { cancion.sonando = false; avisar(); });
    avisar();
    return true;
  }

  function pausarCancion(recordar) {
    if (!cancion.el) return;
    if (recordar !== false) { pref.cancion = false; guardar(); }
    cancion.protagonista = false;
    if (cancion.ganancia && ctx) {
      rampa(cancion.ganancia.gain, 0.0001, 1.2);
      setTimeout(() => { if (cancion.ganancia.gain.value < 0.01) cancion.el.pause(); }, 1300);
    } else cancion.el.pause();
    avisar();
  }

  /* Baja la canción mientras suena un mensaje de voz o un video. */
  function atenuar(activar) {
    cancion.atenuada = !!activar;
    if (cancion.ganancia && ctx && cancion.sonando) rampa(cancion.ganancia.gain, nivelCancion(), 0.8);
    if (tocandoCaja && busMusica) rampa(busMusica.gain, activar ? 0.08 : 0.55, 0.8);
  }

  /* ====================================================================
     CAJA DE MÚSICA DE RESPALDO: «Noche de paz»
     ==================================================================== */
  let tocandoCaja = false, temporizador = null, siguienteNota = 0, indice = 0, corcheaActual = 0;

  function campanita(frec, t, dur, vol, destino) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(destino);
    [[1, 1], [2.01, 0.35], [3.98, 0.12], [5.2, 0.05]].forEach(([m, a]) => {
      const o = ctx.createOscillator();
      o.type = "sine"; o.frequency.value = frec * m;
      const ga = ctx.createGain(); ga.gain.value = a;
      o.connect(ga); ga.connect(g);
      o.start(t); o.stop(t + dur + 0.05);
    });
  }

  const N = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46 };
  const MELODIA = [
    ["G4", 3], ["A4", 1], ["G4", 2], ["E4", 6], ["G4", 3], ["A4", 1], ["G4", 2], ["E4", 6],
    ["D5", 4], ["D5", 2], ["B4", 6], ["C5", 4], ["C5", 2], ["G4", 6],
    ["A4", 4], ["A4", 2], ["C5", 3], ["B4", 1], ["A4", 2], ["G4", 3], ["A4", 1], ["G4", 2], ["E4", 6],
    ["A4", 4], ["A4", 2], ["C5", 3], ["B4", 1], ["A4", 2], ["G4", 3], ["A4", 1], ["G4", 2], ["E4", 6],
    ["D5", 4], ["D5", 2], ["F5", 3], ["D5", 1], ["B4", 2], ["C5", 6], ["E5", 6],
    ["C5", 3], ["G4", 1], ["E4", 2], ["G4", 3], ["F4", 1], ["D4", 2], ["C4", 12], [null, 6]
  ];
  const BAJOS = { 0: "C", 6: "C", 12: "G", 18: "C", 24: "F", 30: "C", 36: "F", 42: "C", 48: "G", 54: "C", 60: "C", 66: "G", 72: "C" };
  const ACORDES = { C: [130.81, 196, 261.63], F: [174.61, 220, 261.63], G: [196, 246.94, 293.66] };
  const CORCHEA = 0.3;

  function pad(frecs, t, dur) {
    frecs.forEach(f => {
      const o = ctx.createOscillator(), g = ctx.createGain(), filtro = ctx.createBiquadFilter();
      o.type = "triangle"; o.frequency.value = f / 2;
      filtro.type = "lowpass"; filtro.frequency.value = 700;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.045, t + 0.6);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(filtro); filtro.connect(g); g.connect(busMusica);
      o.start(t); o.stop(t + dur + 0.1);
    });
  }
  function programar() {
    while (siguienteNota < ctx.currentTime + 0.6) {
      const [nota, dur] = MELODIA[indice];
      if (BAJOS[corcheaActual] !== undefined) pad(ACORDES[BAJOS[corcheaActual]], siguienteNota, CORCHEA * 6.4);
      if (nota) campanita(N[nota], siguienteNota, Math.max(1.4, dur * CORCHEA * 1.6), 0.22, busMusica);
      siguienteNota += dur * CORCHEA;
      corcheaActual += dur;
      indice++;
      if (indice >= MELODIA.length) { indice = 0; corcheaActual = 0; }
    }
  }
  function iniciarCaja() {
    despertar();
    if (!ctx || tocandoCaja) return;
    tocandoCaja = true;
    indice = 0; corcheaActual = 0;
    siguienteNota = ctx.currentTime + 0.15;
    rampa(busMusica.gain, cancion.atenuada ? 0.08 : 0.55, 2);
    programar();
    temporizador = setInterval(programar, 200);
    avisar();
  }
  function detenerCaja() {
    if (!tocandoCaja) return;
    tocandoCaja = false;
    clearInterval(temporizador);
    if (ctx) rampa(busMusica.gain, 0.0001, 0.8);
    avisar();
  }

  /* ====================================================================
     EFECTOS
     ==================================================================== */
  function ruido(t, dur, frecFiltro, vol) {
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = buf; f.type = "bandpass"; f.frequency.value = frecFiltro; f.Q.value = 0.8;
    g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(busFx); s.start(t);
  }
  const EFECTOS = {
    abrir(t) { [1046.5, 1318.5, 1568, 2093].forEach((f, i) => campanita(f, t + i * 0.09, 1.6, 0.16, busFx)); },
    papel(t) { ruido(t, 0.35, 2400, 0.35); ruido(t + 0.12, 0.25, 3200, 0.2); },
    destello(t) { for (let i = 0; i < 6; i++) campanita(1800 + Math.random() * 2200, t + i * 0.05, 0.7, 0.06, busFx); },
    bloqueado(t) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.18);
      g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g); g.connect(busFx); o.start(t); o.stop(t + 0.3);
    },
    exito(t) { [784, 988, 1175, 1568].forEach((f, i) => campanita(f, t + i * 0.12, 1.8, 0.15, busFx)); },
    toque(t) { campanita(1568, t, 0.5, 0.08, busFx); },
    fuego(t) { ruido(t, 0.6, 600, 0.18); for (let i = 0; i < 5; i++) campanita(2000 + Math.random() * 1500, t + 0.05 + i * 0.04, 0.5, 0.03, busFx); }
  };
  function efecto(nombre) {
    if (pref.silencio || !EFECTOS[nombre]) return;
    // Durante el final, la canción manda: los efectos van más bajitos.
    crearContexto();
    if (!ctx || ctx.state !== "running") return;
    busFx.gain.value = cancion.protagonista ? 0.22 : 0.5;
    try { EFECTOS[nombre](ctx.currentTime + 0.01); } catch (e) {}
  }

  /* ====================================================================
     VOLUMEN Y ESTADO
     ==================================================================== */
  function aplicarVolumen() {
    const v = pref.silencio ? 0 : pref.volumen;
    if (ctx) rampa(maestro.gain, v, 0.25);
    if (cancion.el && !cancion.ganancia) cancion.el.volume = v;
  }
  function estado() {
    return {
      cancionDisponible: cancion.disponible, cancionSonando: cancion.sonando, quiereCancion: pref.cancion,
      musica: tocandoCaja, volumen: pref.volumen, silencio: pref.silencio
    };
  }
  function avisar() { const e = estado(); oyentes.forEach(fn => fn(e)); }

  window.Sonido = {
    despertar,
    efecto,
    estado,
    alCambiar(fn) { oyentes.add(fn); fn(estado()); },
    alTiempo(fn) { oyentesTiempo.add(fn); },
    cancion: {
      disponible: () => cancion.disponible === true,
      sonando: () => cancion.sonando,
      tiempo: () => (cancion.el ? cancion.el.currentTime : 0),
      duracion: () => (cancion.el && isFinite(cancion.el.duration) ? cancion.el.duration : 0),
      ir(seg) { if (cancion.el) try { cancion.el.currentTime = seg; } catch (e) {} },
      reproducir: reproducirCancion,
      pausar: pausarCancion,
      alternar() { if (cancion.sonando) pausarCancion(); else reproducirCancion(); },
      soltarProtagonismo() { cancion.protagonista = false; }
    },
    /* Música de fondo: la canción si existe; si no, la caja de música. */
    alternarMusica() {
      if (cancion.disponible) return this.cancion.alternar();
      pref.musica = !tocandoCaja;
      if (pref.musica) { pref.silencio = false; aplicarVolumen(); iniciarCaja(); } else detenerCaja();
      guardar(); avisar();
    },
    alternarCaja() {
      if (tocandoCaja) { detenerCaja(); pref.musica = false; }
      else { if (cancion.sonando) pausarCancion(); pref.musica = true; pref.silencio = false; aplicarVolumen(); iniciarCaja(); }
      guardar(); avisar();
    },
    /* Para el botón de bienvenida: empieza la canción con un fundido. */
    empezarBienvenida() {
      despertar();
      if (pref.silencio) return;
      if (pref.cancion !== false && reproducirCancion({ fundido: 3.5 })) return;
      if (pref.musica) iniciarCaja();
    },
    /* En cualquier toque: si ella la tenía sonando, la retomamos. */
    reanudarSiCorresponde() {
      despertar();
      if (pref.silencio) return;
      if (cancion.disponible && pref.cancion && !cancion.sonando && sesionConCancion) reproducirCancion({ fundido: 2 });
      else if (!cancion.disponible && pref.musica && !tocandoCaja) iniciarCaja();
    },
    marcarSesionConCancion() { sesionConCancion = true; },
    atenuar,
    volumen(v) { pref.volumen = Math.min(1, Math.max(0, v)); if (pref.volumen > 0) pref.silencio = false; aplicarVolumen(); guardar(); avisar(); },
    silenciar(forzar) { pref.silencio = typeof forzar === "boolean" ? forzar : !pref.silencio; aplicarVolumen(); guardar(); avisar(); }
  };
  /* Solo retomamos sola la canción si ella ya la escuchó alguna vez. */
  let sesionConCancion = (function () { try { return localStorage.getItem("adri-escucho-cancion") === "1"; } catch (e) { return false; } })();
  window.Sonido.alCambiar(e => { if (e.cancionSonando && !sesionConCancion) { sesionConCancion = true; try { localStorage.setItem("adri-escucho-cancion", "1"); } catch (er) {} } });

  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) { if (!cancion.sonando) ctx.suspend().catch(() => {}); }
    else if (tocandoCaja || cancion.sonando) ctx.resume().catch(() => {});
  });
})();
