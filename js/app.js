/* ==========================================================================
   APP · lógica del calendario
   - Tiempo en America/Lima
   - Progreso guardado en localStorage
   - Intro, puertas, árbol, universo, gran final, secretos, modo prueba, PWA
   ========================================================================== */
(function () {
  "use strict";

  const CFG = window.CALENDARIO;
  const { h } = window.Sorpresas;
  const $ = s => document.querySelector(s);
  const quieto = () => window.Efectos.quieto();
  const pad2 = n => String(n).padStart(2, "0");
  const TOTAL = 24;

  /* ======================================================================
     TIEMPO (America/Lima)
     ====================================================================== */
  const MODO_PRUEBA = !CFG.produccion && location.hash === "#probar";
  let simulado = null;

  const Tiempo = (function () {
    let formato = null;
    try {
      formato = new Intl.DateTimeFormat("en-US", { timeZone: CFG.zonaHoraria, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23" });
    } catch (e) { formato = null; }
    function partes(ms) {
      if (!formato) { const d = new Date(ms - 5 * 3600e3); return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds() }; }
      const o = {};
      formato.formatToParts(new Date(ms)).forEach(p => { if (p.type !== "literal") o[p.type] = parseInt(p.value, 10); });
      o.hour = o.hour % 24;
      return o;
    }
    /* Convierte una hora de Lima a milisegundos UTC. */
    function aUTC(y, mes, d, hora) {
      const intento = Date.UTC(y, mes - 1, d, hora || 0);
      const p = partes(intento);
      const visto = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
      return intento - (visto - intento);
    }
    const aperturas = Array.from({ length: TOTAL }, (_, i) => aUTC(CFG.anio, 12, i + 1, 0));
    const navidad = aUTC(CFG.anio, 12, 25, 0);
    return {
      ahora: () => (simulado != null ? simulado : Date.now()),
      apertura: d => aperturas[d - 1],
      navidad,
      aUTC,
      partes
    };
  })();

  const disponible = d => Tiempo.ahora() >= Tiempo.apertura(d);
  /* Cada día: «fotos/dia-NN/foto.jpg» y su miniatura «fotos/dia-NN/mini.jpg». */
  const mini = ruta => String(ruta).replace(/foto\.jpg$/, "mini.jpg");
  const esNavidad = () => Tiempo.ahora() >= Tiempo.navidad;

  /* ======================================================================
     ESTADO (localStorage)
     ====================================================================== */
  /* Clave de la versión definitiva: Adriana empieza con las 24 puertas sin
     abrir. No la cambies durante diciembre o se borraría su progreso. */
  const CLAVE = "adri-calendario-2026";
  const Estado = (function () {
    let e = { abiertas: [], datos: {}, introVista: false, visitas: 0, secretos: [], finalVisto: false };
    try {
      const guardado = JSON.parse(localStorage.getItem(CLAVE) || "null");
      if (guardado) Object.assign(e, guardado);
    } catch (err) {}
    const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(e)); } catch (err) {} };
    return {
      get: () => e,
      abierta: d => e.abiertas.includes(d),
      abrir(d) { if (!e.abiertas.includes(d)) { e.abiertas.push(d); e.abiertas.sort((a, b) => a - b); guardar(); } },
      datos(d) { return (e.datos[d] = e.datos[d] || {}); },
      guardar,
      reiniciar() { e = { abiertas: [], datos: {}, introVista: false, visitas: 0, secretos: [], finalVisto: false }; guardar(); }
    };
  })();

  /* Si alguien abre en un día anterior a la fecha (cambio de hora del
     celular, modo prueba…), no mostramos como abiertas puertas futuras. */
  const abiertaVisible = d => Estado.abierta(d) && disponible(d);
  const totalAbiertas = () => Array.from({ length: TOTAL }, (_, i) => i + 1).filter(abiertaVisible).length;

  /* ======================================================================
     UTILIDADES DE INTERFAZ
     ====================================================================== */
  let tAviso;
  function aviso(texto, ms) {
    const a = $("#aviso");
    a.textContent = texto;
    a.classList.add("visible");
    clearTimeout(tAviso);
    tAviso = setTimeout(() => a.classList.remove("visible"), ms || 3600);
  }
  function centro(el) {
    if (!el) return [innerWidth / 2, innerHeight / 2];
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  }
  function fx(tipo, el) { const [x, y] = centro(el); window.Efectos.Fx.lanzar(tipo, x, y); }

  /* Íconos de trazo para dar personalidad a cada puerta. */
  const ICONOS = {
    estrella: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
    corazon: '<path d="M12 20s-7-4.4-9-8.6C1.6 8.3 3.6 5 6.8 5c2 0 3.4 1.1 4.2 2.4.4.6.6.6 1 0C12.8 6.1 14.2 5 16.2 5c3.2 0 5.2 3.3 3.8 6.4C18 15.6 12 20 12 20z"/>',
    campana: '<path d="M12 3.5a1.4 1.4 0 011.4 1.4v.5A6 6 0 0118 11.3V15l2 2H4l2-2v-3.7a6 6 0 014.6-5.9v-.5A1.4 1.4 0 0112 3.5zM10 19.5a2 2 0 004 0"/>',
    copo: '<path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6M9.2 4.2L12 6l2.8-1.8M9.2 19.8L12 18l2.8 1.8"/>',
    regalo: '<path d="M4.5 10.5h15v9.5h-15zM3.5 7.5h17v3h-17zM12 7.5V20M12 7.5S10.5 3.5 8 4.4s1 3.1 4 3.1zm0 0s1.5-4 4-3.1-1 3.1-4 3.1z"/>',
    esfera: '<path d="M12 8a6.5 6.5 0 110 13 6.5 6.5 0 010-13zM10.2 5h3.6v3h-3.6zM6 13.5c3.8 1.8 8.2 1.8 12 0"/>',
    vela: '<path d="M9.5 10.5h5V21h-5zM12 3c1.6 2 2 3.2 0 5.2-2-2-1.6-3.2 0-5.2z"/>',
    arbol: '<path d="M12 2.5l4.6 5.5h-2.8l3.8 5h-2.8l3.7 5H5.5l3.7-5H6.4l3.8-5H7.4zM11 18h2v3.5h-2z"/>',
    luna: '<path d="M19.5 14.6A7.6 7.6 0 019.4 4.5a7.6 7.6 0 1010.1 10.1z"/>',
    baston: '<path d="M9 21V8.5a3.8 3.8 0 017.6 0V10"/><path d="M9 12.5l2.5-1.5M9 16.5l2.5-1.5M10.5 6l2.2 1.6"/>',
    lazo: '<path d="M12 12c-3-3.8-7.6-5-7.6-1.2S9 14 12 12zm0 0c3-3.8 7.6-5 7.6-1.2S15 14 12 12zm0 0l-2.8 7.5M12 12l2.8 7.5"/>',
    taza: '<path d="M4.5 9.5h11.5v5.5a5 5 0 01-5 5H9.5a5 5 0 01-5-5zM16 11h1.8a2.2 2.2 0 010 4.4H16M8.5 3.5c0 1.8 1.6 1.8 1.6 3.6M12.3 3.5c0 1.8 1.6 1.8 1.6 3.6"/>'
  };
  const NOMBRES_ICONOS = Object.keys(ICONOS);
  const svgIcono = (nombre, clase) => '<svg class="' + (clase || "icono") + '" viewBox="0 0 24 24" aria-hidden="true">' + ICONOS[nombre] + "</svg>";
  const CANDADO = '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5"/></svg>';

  /* Personalidad de cada puerta: color, patrón e ícono. */
  const VARIANTES = ["vino", "oro", "crema", "noche"];
  const PATRONES = ["liso", "rayas", "puntos", "rombos", "estrellado"];
  const ICONO_DIA = [null, "estrella", "regalo", "corazon", "taza", "esfera", "lazo", "arbol", "regalo", "campana", "vela", "copo", "regalo", "luna", "regalo", "corazon", "corazon", "estrella", "regalo", "copo", "regalo", "baston", "regalo", "vela", "arbol"];
  const EFECTO_DIA = d => ((CFG.sorpresas[d - 1] || {}).aniversario ? "corazones" : ["oro", "estrellas", "corazones", "nieve"][d % 4]);
  const MESES_ES = "diciembre";

  /* ======================================================================
     CABECERA, PROGRESO Y CUENTA REGRESIVA
     ====================================================================== */
  function pintarCabecera() {
    $("#cabEyebrow").textContent = "Para " + CFG.para + " · Navidad " + CFG.anio;
    $("#cabTitulo").textContent = esNavidad() ? "Feliz Navidad, " + CFG.para : CFG.titulo;
    $("#cabSubtitulo").textContent = esNavidad() ? "Las 24 puertas ya son tuyas. Tu pequeño universo sigue aquí, para siempre." : CFG.subtitulo;
    $("#pieDe").textContent = CFG.de;
    document.body.classList.toggle("es-navidad", esNavidad());
  }

  function pintarProgreso() {
    const n = totalAbiertas();
    $("#progresoTexto").textContent = n === 0 ? "Aún no abres ninguna puerta" : n + (n === 1 ? " sorpresa abierta" : " sorpresas abiertas") + " de " + TOTAL;
    $("#progresoPct").textContent = Math.round((n / TOTAL) * 100) + "%";
    $("#progresoRelleno").style.width = (n / TOTAL) * 100 + "%";
    const barra = $("#progresoBarra");
    barra.setAttribute("aria-valuenow", n);
    barra.setAttribute("aria-valuetext", n + " de " + TOTAL);
  }

  function formatoDuracion(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400), hh = Math.floor((s % 86400) / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
    return (d > 0 ? d + (d === 1 ? " día · " : " días · ") : "") + pad2(hh) + ":" + pad2(mm) + ":" + pad2(ss);
  }

  let ultimoDisponible = -1;
  function pintarCuenta() {
    const ahora = Tiempo.ahora();
    let proximo = 0;
    for (let d = 1; d <= TOTAL; d++) if (!disponible(d)) { proximo = d; break; }
    const etiqueta = $("#cuentaEtiqueta"), reloj = $("#cuentaReloj"), extra = $("#cuentaExtra");
    const pendientes = Array.from({ length: TOTAL }, (_, i) => i + 1).filter(d => disponible(d) && !Estado.abierta(d));

    if (esNavidad()) {
      etiqueta.textContent = "Es Navidad";
      reloj.textContent = "Feliz Navidad 🎄";
    } else if (proximo === 0) {
      etiqueta.textContent = "Todas tus puertas ya están abiertas";
      reloj.textContent = "Nochebuena ✨";
    } else {
      etiqueta.textContent = proximo === 1 ? "Tu primera puerta se abre en" : "La puerta " + proximo + " se abre en";
      reloj.textContent = formatoDuracion(Tiempo.apertura(proximo) - ahora);
    }
    extra.textContent = pendientes.length ? (pendientes.length === 1 ? "La puerta " + pendientes[0] + " te está esperando." : "Tienes " + pendientes.length + " puertas esperándote.") : "";

    // Si en este segundo se abrió una puerta nueva, se repinta todo.
    const disp = Array.from({ length: TOTAL }, (_, i) => i + 1).filter(disponible).length;
    if (ultimoDisponible !== -1 && disp !== ultimoDisponible) { pintarTodo(); if (disp > ultimoDisponible) { aviso("✨ Se acaba de abrir la puerta " + disp + "."); window.Sonido.efecto("destello"); } }
    ultimoDisponible = disp;
  }

  /* ======================================================================
     PUERTAS
     ====================================================================== */
  function estadoPuerta(d) { return abiertaVisible(d) ? "abierta" : disponible(d) ? "disponible" : "bloqueada"; }

  function pintarPuertas() {
    const ol = $("#rejilla");
    ol.innerHTML = "";
    for (let d = 1; d <= TOTAL; d++) {
      const s = CFG.sorpresas[d - 1] || {};
      const est = estadoPuerta(d);
      const variante = d === TOTAL || s.aniversario ? "gala" : VARIANTES[(d * 7 + 1) % 4];
      const patron = PATRONES[(d * 3) % PATRONES.length];
      const miniatura = s.foto ? mini(s.foto) : null;
      const li = h("li", { class: "puerta-item", style: "--r:" + (((d * 37) % 7) - 3) * 0.4 + "deg;--i:" + d });
      const etiquetas = { abierta: "ya abierta, toca para volver a verla", disponible: "lista para abrir", bloqueada: "se abre el " + d + " de diciembre" };
      const b = h("button", { type: "button", class: "puerta v-" + variante + " p-" + patron + " " + est, "data-d": d, "aria-label": "Puerta " + d + ", " + etiquetas[est] });
      b.innerHTML =
        '<span class="puerta-hueco" aria-hidden="true"><span class="hueco-brillo"></span>' +
          (est === "abierta" && miniatura ? '<img class="hueco-foto" src="' + miniatura + '" alt="" decoding="async">' : '<span class="hueco-icono">' + svgIcono(s.tipo === "vale" ? "taza" : s.tipo === "regalo" || s.regalo ? "regalo" : "corazon") + "</span>") +
        "</span>" +
        '<span class="puerta-hoja" aria-hidden="true"><span class="hoja-frente">' +
          '<span class="hoja-num">' + pad2(d) + "</span>" +
          svgIcono(ICONO_DIA[d] || NOMBRES_ICONOS[d % NOMBRES_ICONOS.length], "icono hoja-icono") +
          '<span class="hoja-estado">' + (est === "bloqueada" ? CANDADO : est === "disponible" ? "Ábreme" : "") + "</span>" +
          '<span class="hoja-pomo"></span>' +
        '</span><span class="hoja-dorso"></span></span>';
      b.addEventListener("click", () => tocarPuerta(d, b));
      li.append(b);
      ol.append(li);
    }
  }

  function tocarPuerta(d, b) {
    window.Sonido.despertar();
    window.Sonido.reanudarSiCorresponde();
    if (!disponible(d)) {
      window.Sonido.efecto("bloqueado");
      b.classList.remove("tiembla"); void b.offsetWidth; b.classList.add("tiembla");
      aviso("Todavía no ✨ Esta sorpresa se abre el " + d + " de diciembre a las 00:00 (hora de Lima).");
      return;
    }
    if (d === TOTAL && CFG.sorpresas[d - 1].tipo === "final") {
      b.classList.add("abriendo");
      window.Sonido.efecto("abrir");
      cancionFinalEnElToque();
      setTimeout(() => { b.classList.remove("abriendo"); abrirFinal(); }, quieto() ? 0 : 900);
      return;
    }
    if (CFG.sorpresas[d - 1] && CFG.sorpresas[d - 1].aniversario) {
      b.classList.add("abriendo");
      window.Sonido.efecto("abrir");
      cancionEnElToque(ANIV.inicioCancion || 0);
      setTimeout(() => { b.classList.remove("abriendo"); abrirAniversario(); }, quieto() ? 0 : 900);
      return;
    }
    b.classList.add("abriendo");
    window.Sonido.efecto("abrir");
    setTimeout(() => abrirSorpresa(d, b), quieto() ? 0 : 820);
  }

  /* ======================================================================
     MODAL DE SORPRESA
     ====================================================================== */
  let focoAnterior = null, puertaActiva = null;
  function abrirSorpresa(d, puerta) {
    const s = CFG.sorpresas[d - 1];
    if (!s) return;
    if (s.aniversario) return abrirAniversario();
    focoAnterior = document.activeElement;
    puertaActiva = puerta || null;
    const modal = $("#modal"), cuerpo = $("#modalCuerpo");
    $("#modalEyebrow").textContent = (s.etiqueta || window.Sorpresas.etiqueta(s.tipo)) + " · " + d + " de " + MESES_ES;
    $("#modalDia").textContent = pad2(d);
    $("#modalFirma").textContent = [CFG.firma, CFG.de].filter(Boolean).join(", ");
    cuerpo.innerHTML = "";
    const ctx = {
      dia: d, para: CFG.para, de: CFG.de, firma: CFG.firma,
      datos: Estado.datos(d), guardar: Estado.guardar,
      sonido: n => window.Sonido.efecto(n), fx,
      atenuar: on => window.Sonido.atenuar(on),
      revivirFinal: () => { cancionFinalEnElToque(); cerrarSorpresa(true); setTimeout(abrirFinal, 250); }
    };
    cuerpo.append(window.Sorpresas.crear(s, ctx));
    const titulo = cuerpo.querySelector("h3");
    if (titulo) titulo.id = "modalTitulo";
    modal.className = "modal efecto-" + EFECTO_DIA(d) + " tipo-" + s.tipo;
    modal.hidden = false;
    document.documentElement.classList.add("sin-scroll");
    requestAnimationFrame(() => {
      modal.classList.add("visible");
      $("#modalCerrar").focus({ preventScroll: true });
      setTimeout(() => fx(EFECTO_DIA(d), $(".modal-panel")), quieto() ? 0 : 280);
    });
    const nueva = !Estado.abierta(d);
    Estado.abrir(d);
    if (nueva) setTimeout(() => window.Sonido.efecto("destello"), 400);
  }

  function cerrarSorpresa(rapido) {
    const modal = $("#modal");
    if (modal.hidden) return;
    modal.classList.remove("visible");
    document.documentElement.classList.remove("sin-scroll");
    setTimeout(() => {
      modal.hidden = true;
      $("#modalCuerpo").innerHTML = "";
      pintarTodo();
      const d = puertaActiva && puertaActiva.dataset.d;
      const destino = d ? document.querySelector('.puerta[data-d="' + d + '"]') : focoAnterior;
      if (destino && destino.focus && !rapido) destino.focus({ preventScroll: true });
    }, rapido || quieto() ? 0 : 320);
  }

  $("#modal").addEventListener("click", e => { if (e.target.closest("[data-cerrar]")) cerrarSorpresa(); });
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (!$("#modal").hidden) cerrarSorpresa();
    else if (!$("#aniversario").hidden) cerrarAniversario();
    else if (!$("#final").hidden) cerrarFinal();
    else if (!$("#panelSonido").hidden) alternarPanelSonido(false);
  });

  /* ======================================================================
     ÁRBOL QUE SE DECORA
     ====================================================================== */
  const FILAS = [[100, 2], [145, 3], [185, 4], [225, 4], [262, 5], [294, 6]];
  const ADORNOS = [];
  (function () {
    let d = 1;
    FILAS.forEach(([y, n]) => {
      const mitad = ((y - 40) / 265) * 118 * 0.78;
      for (let i = 0; i < n; i++) {
        const x = 150 - mitad + (n === 1 ? mitad : (2 * mitad * i) / (n - 1));
        ADORNOS.push({ d: d++, x: Math.round(x + ((i % 2) * 4 - 2)), y: y + ((i % 2) * 6 - 3) });
      }
    });
  })();

  function pintarArbol() {
    const svg = $("#arbolSvg");
    const encendidos = ADORNOS.filter(a => abiertaVisible(a.d)).length;
    const completo = encendidos === TOTAL;
    let html =
      '<defs><linearGradient id="gArbol" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1218"/><stop offset="1" stop-color="#120709"/></linearGradient>' +
      '<radialGradient id="gLuz"><stop offset="0" stop-color="#fff3d6"/><stop offset=".45" stop-color="#f0d79a"/><stop offset="1" stop-color="#d4af6a" stop-opacity="0"/></radialGradient></defs>' +
      '<path class="arbol-cuerpo" d="M150 40L205 125 182 122 240 210 210 206 272 305H28L90 206 60 210 118 122 95 125Z"/>' +
      '<rect class="arbol-tronco" x="139" y="305" width="22" height="30" rx="3"/>' +
      '<path class="arbol-guirnalda" d="M112 110Q150 135 190 108M86 175Q150 205 214 172M64 252Q150 285 238 248"/>';
    ADORNOS.forEach(a => {
      const on = abiertaVisible(a.d);
      html += '<g class="adorno' + (on ? " encendido" : "") + '" data-d="' + a.d + '"' + (on ? ' tabindex="0" role="button" aria-label="Adorno del día ' + a.d + ', ver la sorpresa"' : ' aria-hidden="true"') + ">" +
        (on ? '<circle class="adorno-halo" cx="' + a.x + '" cy="' + a.y + '" r="13" fill="url(#gLuz)"/>' : "") +
        '<circle class="adorno-bola" cx="' + a.x + '" cy="' + a.y + '" r="' + (on ? 6.5 : 4.5) + '"/></g>';
    });
    html += '<g class="arbol-estrella' + (completo ? " encendida" : "") + '" id="estrellaArbol" tabindex="0" role="button" aria-label="Estrella del árbol">' +
      '<circle cx="150" cy="34" r="22" fill="url(#gLuz)" class="estrella-halo"/>' +
      '<path d="M150 18l4.6 9.6 10.6 1.3-7.8 7.3 2 10.4-9.4-5.1-9.4 5.1 2-10.4-7.8-7.3 10.6-1.3z"/></g>';
    svg.innerHTML = html;
    $("#arbolTexto").textContent = completo ? "Tu árbol está completo. La estrella brilla por ti." :
      encendidos === 0 ? "Cada puerta que abras encenderá un adorno. La estrella de arriba se enciende con la última." :
      encendidos + (encendidos === 1 ? " adorno encendido" : " adornos encendidos") + ". Toca uno para volver a ver su sorpresa.";
  }

  $("#arbolSvg").addEventListener("click", e => {
    const adorno = e.target.closest(".adorno.encendido");
    if (adorno) { const d = +adorno.dataset.d; if (d === TOTAL) abrirFinal(); else abrirSorpresa(d); return; }
    if (e.target.closest("#estrellaArbol")) secretoEstrella();
  });
  $("#arbolSvg").addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const g = e.target.closest(".adorno.encendido, #estrellaArbol");
    if (!g) return;
    e.preventDefault(); g.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  /* ======================================================================
     NUESTRO PEQUEÑO UNIVERSO (estrellas + álbum)
     ====================================================================== */
  const ASTROS = Array.from({ length: TOTAL }, (_, i) => {
    const r = 18 + i * 4.3, a = i * 2.399 + 0.6;
    return { d: i + 1, x: Math.round(180 + r * Math.cos(a) * 1.55), y: Math.round(122 + r * Math.sin(a) * 0.95) };
  }).map(p => ({ d: p.d, x: Math.max(14, Math.min(346, p.x)), y: Math.max(14, Math.min(232, p.y)) }));

  function pintarUniverso() {
    const svg = $("#mapaSvg");
    const abiertas = ASTROS.filter(a => abiertaVisible(a.d));
    let html = '<defs><radialGradient id="gAstro"><stop offset="0" stop-color="#fff6e4"/><stop offset=".4" stop-color="#f0d79a" stop-opacity=".8"/><stop offset="1" stop-color="#d4af6a" stop-opacity="0"/></radialGradient></defs><g class="mapa-lineas">';
    for (let i = 1; i < abiertas.length; i++) html += '<line x1="' + abiertas[i - 1].x + '" y1="' + abiertas[i - 1].y + '" x2="' + abiertas[i].x + '" y2="' + abiertas[i].y + '"/>';
    html += "</g>";
    ASTROS.forEach(a => {
      const on = abiertaVisible(a.d);
      html += on
        ? '<g class="astro-mapa encendido" data-d="' + a.d + '" tabindex="0" role="button" aria-label="Recuerdo del ' + a.d + ' de diciembre: ' + escapar(CFG.sorpresas[a.d - 1].titulo) + '">' +
          '<circle cx="' + a.x + '" cy="' + a.y + '" r="15" fill="url(#gAstro)"/><circle class="astro-nucleo" cx="' + a.x + '" cy="' + a.y + '" r="3.2"/>' +
          '<text x="' + a.x + '" y="' + (a.y + 17) + '">' + a.d + "</text></g>"
        : '<circle class="astro-apagado" cx="' + a.x + '" cy="' + a.y + '" r="1.6" aria-hidden="true"/>';
    });
    svg.innerHTML = html;

    // Álbum de fotos y lista de cartas, cupones y regalos.
    const fotos = $("#albumFotos"), lista = $("#albumLista");
    fotos.innerHTML = ""; lista.innerHTML = "";
    abiertas.forEach(({ d }) => {
      const s = CFG.sorpresas[d - 1];
      if (s.foto) {
        fotos.append(h("button", { type: "button", class: "album-polaroid", style: "--r:" + (((d * 53) % 9) - 4) + "deg", onclick: () => (d === TOTAL ? abrirFinal() : abrirSorpresa(d)), "aria-label": "Ver el recuerdo del " + d + " de diciembre" },
          h("img", { src: mini(s.foto), alt: s.titulo, decoding: "async" }),
          h("span", { text: d + " dic · " + s.titulo })));
      } else {
        const dato = Estado.datos(d);
        lista.append(h("button", { type: "button", class: "album-ficha tipo-" + s.tipo, onclick: () => abrirSorpresa(d) },
          h("span", { class: "ficha-dia", text: pad2(d) }),
          h("span", { class: "ficha-texto" }, h("small", { text: window.Sorpresas.etiqueta(s.tipo) + (s.tipo === "vale" && dato.canjeado ? " · canjeado" : "") }), h("strong", { text: s.titulo }))));
      }
    });
    $("#albumVacio").hidden = abiertas.length > 0;
    $("#revivirBloque").hidden = !abiertaVisible(TOTAL);
    $("#revivirAnivBloque").hidden = !(diaAniversario() && abiertaVisible(diaAniversario()));
    $("#albumCuenta").textContent = abiertas.length ? abiertas.length + (abiertas.length === 1 ? " recuerdo guardado" : " recuerdos guardados") : "";
  }
  function escapar(t) { return String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]); }

  $("#mapaSvg").addEventListener("click", e => {
    const g = e.target.closest(".astro-mapa");
    if (!g) return;
    window.Sonido.efecto("toque");
    const d = +g.dataset.d;
    if (d === TOTAL) abrirFinal(); else abrirSorpresa(d);
  });
  $("#mapaSvg").addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const g = e.target.closest(".astro-mapa");
    if (g) { e.preventDefault(); g.dispatchEvent(new MouseEvent("click", { bubbles: true })); }
  });

  function pintarTodo() {
    pintarCabecera();
    pintarProgreso();
    pintarPuertas();
    pintarArbol();
    pintarUniverso();
  }

  /* ======================================================================
     INTRO CINEMATOGRÁFICA
     ====================================================================== */
  function prepararIntro() {
    $("#introNombre").textContent = CFG.para;
    $("#introSello").textContent = CFG.para.charAt(0);
    $("#introFrase").textContent = esNavidad() ? CFG.intro.fraseNavidad : CFG.intro.frase;
    $("#introDe").textContent = "De " + CFG.de + ", con todo mi amor";
    $("#introComenzar").textContent = esNavidad() ? "Entrar a mi universo" : "Abrir mi regalo";
    // El nombre aparece letra por letra.
    const nombre = $("#introNombre");
    nombre.innerHTML = "";
    [...CFG.para].forEach((l, i) => nombre.append(h("span", { style: "--i:" + i, text: l })));
    nombre.setAttribute("aria-label", CFG.para);
  }

  function mostrarIntro() {
    prepararIntro();
    const intro = $("#intro");
    intro.hidden = false;
    intro.classList.remove("saliendo", "abierta");
    void intro.offsetWidth;
    intro.classList.add("activa");
    $("#app").hidden = true; $("#barraNav").hidden = true; $("#miniReproductor").hidden = true; alternarPanelSonido(false);
    setTimeout(() => $("#introComenzar").focus({ preventScroll: true }), quieto() ? 0 : 4200);
  }

  function terminarIntro(animada) {
    const intro = $("#intro");
    // Este toque es el que permite al navegador empezar «Tú y yo».
    window.Sonido.empezarBienvenida();
    const e = Estado.get();
    e.introVista = true; Estado.guardar();
    if (animada && !quieto()) {
      intro.classList.add("abierta");
      window.Sonido.efecto("abrir");
      setTimeout(() => { fx("oro", $(".intro-sobre")); window.Sonido.efecto("destello"); }, 650);
      setTimeout(() => intro.classList.add("saliendo"), 1500);
      setTimeout(() => entrarApp(true), 2300);
    } else entrarApp(false);
  }
  $("#introComenzar").addEventListener("click", () => terminarIntro(true));
  $("#introOmitir").addEventListener("click", () => terminarIntro(false));

  function entrarApp(animada) {
    $("#intro").hidden = true;
    $("#intro").classList.remove("activa", "abierta", "saliendo");
    const app = $("#app");
    app.hidden = false; $("#barraNav").hidden = false;
    $("#miniReproductor").hidden = !window.Sonido.cancion.disponible();
    if (animada) { app.classList.remove("entra"); void app.offsetWidth; app.classList.add("entra"); }
    pintarTodo();
    window.scrollTo(0, 0);
  }

  /* Mensaje al volver. */
  function saludoDeRegreso() {
    const pendientes = Array.from({ length: TOTAL }, (_, i) => i + 1).filter(d => disponible(d) && !Estado.abierta(d));
    if (esNavidad()) return aviso("Feliz Navidad, " + CFG.para + " 🎄 Tu universo de recuerdos sigue aquí.", 5000);
    if (pendientes.length === 1) return aviso("Hola de nuevo, " + CFG.para + ". La puerta " + pendientes[0] + " te está esperando ✨", 5000);
    if (pendientes.length > 1) return aviso("Hola de nuevo, " + CFG.para + ". Tienes " + pendientes.length + " puertas esperándote ✨", 5000);
    const lista = CFG.regresos || [];
    if (lista.length) aviso(lista[Math.floor(Math.random() * lista.length)], 4500);
  }

  /* ======================================================================
     GRAN FINAL (24 de diciembre)
     Todo el final sigue un reloj: el de «Tú y yo» si está sonando, o el
     reloj normal si no hay canción. Así las fotos caen en los momentos
     musicales que marques en config.js (final.marcasFotos).
     ====================================================================== */
  let escena = null, relojFinal = 0, relojF = null, pasosHechos = new Set(), guion = [], conCancion = false;

  /* ---- Compartido por el gran final y el aniversario ------------------ */
  /* En iPhone la canción debe empezar dentro del toque mismo. */
  let toqueCancion = 0;
  function cancionEnElToque(desde) {
    if (!window.Sonido.cancion.disponible() || window.Sonido.estado().silencio) return false;
    window.Sonido.cancion.reproducir({ desde, protagonista: true, fundido: 3 });
    toqueCancion = performance.now();
    return true;
  }
  function cancionFinalEnElToque() { return cancionEnElToque((CFG.final && CFG.final.inicioCancion) || 0); }
  /* Al abrir la escena: si la canción ya arrancó en el toque, no la reiniciamos. */
  function cancionParaEscena(desde) {
    if (!window.Sonido.cancion.disponible() || window.Sonido.estado().silencio) return false;
    if (performance.now() - toqueCancion < 3000) return true;
    return window.Sonido.cancion.reproducir({ desde, protagonista: true, fundido: 3 });
  }
  /* Reloj de una escena: el de la canción si suena; si no arranca en 4 s, el normal. */
  function crearReloj(desde, conCancion) {
    let inicio = performance.now(), respaldo = false;
    return function () {
      const transcurrido = (performance.now() - inicio) / 1000;
      if (conCancion && !respaldo) {
        if (window.Sonido.cancion.sonando()) return window.Sonido.cancion.tiempo() - desde;
        if (transcurrido < 4) return 0;
        respaldo = true; inicio = performance.now(); return 0;
      }
      return transcurrido;
    };
  }

  function armarGuion(nFotos) {
    const F = CFG.final || {};
    const marcas = Array.isArray(F.marcasFotos) && F.marcasFotos.length >= nFotos ? F.marcasFotos.slice(0, nFotos) : Array.from({ length: nFotos }, (_, i) => 3 + i * 2.8);
    const ultima = marcas.length ? marcas[marcas.length - 1] : 3;
    const m = Object.assign({ corazon: 1.5, carta: 5, despedida: 9, dedicatoria: 12.5 }, F.momentos || {});
    const pasos = [{ t: 0.2, id: "entrada" }, { t: Math.max(0.5, (marcas[0] || 3) - 0.6), id: "fotos" }];
    marcas.forEach((t, i) => pasos.push({ t, id: "foto" + i, foto: i }));
    pasos.push({ t: ultima + m.corazon, id: "corazon" }, { t: ultima + m.carta, id: "carta" }, { t: ultima + m.despedida, id: "despedida" }, { t: ultima + m.dedicatoria, id: "dedicatoria" });
    return pasos;
  }

  function ejecutarPaso(p) {
    const fin = $("#final");
    if (p.foto != null) {
      const el = $("#finalFotos").children[p.foto];
      if (el) el.classList.add("aparece");
      return;
    }
    switch (p.id) {
      case "entrada": fin.classList.add("paso-entrada"); break;
      case "fotos": fin.classList.add("paso-fotos"); break;
      case "corazon": fin.classList.add("paso-corazon"); escena.corazon(); window.Sonido.efecto("destello"); break;
      case "carta": fin.classList.add("paso-carta"); window.Sonido.efecto("papel"); break;
      case "despedida": fin.classList.add("paso-despedida"); escena.fuegos(); break;
      case "dedicatoria": fin.classList.add("paso-dedicatoria"); break;
    }
  }

  function bucleFinal() {
    const t = relojF ? relojF() : 0;
    for (const p of guion) if (!pasosHechos.has(p.id) && t >= p.t) { pasosHechos.add(p.id); ejecutarPaso(p); }
    if (pasosHechos.size < guion.length) relojFinal = requestAnimationFrame(bucleFinal);
  }

  /* Fotos del gran final (miniaturas de cada día + la del puente). */
  const rutasFinal = () => CFG.sorpresas.flatMap(x => (x && x.foto ? [mini(x.foto)] : [])).concat(CFG.sorpresas[TOTAL - 1].foto ? [CFG.sorpresas[TOTAL - 1].foto] : []);
  function abrirFinal() {
    conFotos(rutasFinal(), iniciarFinal, () => { cancionFinalEnElToque(); abrirFinal(); });
  }
  function iniciarFinal() {
    const s = CFG.sorpresas[TOTAL - 1];
    const F = CFG.final || {};
    const fin = $("#final");
    if (fin.hidden) focoAnterior = document.activeElement;
    cancelAnimationFrame(relojFinal);
    alternarPanelSonido(false);
    Estado.abrir(TOTAL);
    const e = Estado.get(); e.finalVisto = true; Estado.guardar();

    $("#finalEntrada").textContent = F.entrada || "";
    $("#finalDespedida").textContent = F.despedida || "";
    $("#finalCierre").textContent = (F.cierre || "") + " — " + CFG.de;

    // Dedicatoria: aparece palabra por palabra.
    const ded = $("#finalDedicatoria");
    ded.innerHTML = "";
    String(F.dedicatoria || "").split(/\s+/).filter(Boolean).forEach((p, i) => ded.append(h("span", { style: "--i:" + i, text: p + " " })));
    ded.setAttribute("aria-label", F.dedicatoria || "");

    // Presentación de nuestras fotos.
    const contenedor = $("#finalFotos");
    contenedor.innerHTML = "";
    const fotos = CFG.sorpresas.map((x, i) => (x.foto ? { src: mini(x.foto), d: i + 1 } : null)).filter(Boolean);
    fotos.forEach((f, i) => {
      const ang = (i / fotos.length) * Math.PI * 2 + 0.4;
      contenedor.append(h("figure", { class: "final-polaroid", style: "--x:" + Math.round(Math.cos(ang) * 34) + "vw;--y:" + Math.round(Math.sin(ang) * 30) + "vh;--r:" + (((i * 47) % 17) - 8) + "deg;--i:" + i },
        h("img", { src: f.src, alt: "", decoding: "async" }),
        h("figcaption", { text: f.d + " dic" })));
    });

    // Carta final.
    const carta = $("#finalCarta");
    carta.innerHTML = "";
    carta.append(
      h("p", { class: "eyebrow", text: "24 de diciembre · Nochebuena" }),
      h("h3", { class: "final-titulo", text: s.titulo }),
      h("div", { class: "lineas" }, s.texto.split("\n").map((l, i) => h("p", { style: "--i:" + i, text: l }))),
      s.foto ? h("figure", { class: "polaroid final-foto" }, h("img", { src: s.foto, alt: "Nosotros en el Puente de los Suspiros", decoding: "async" })) : null,
      s.regalo ? h("div", { class: "nota-regalo" }, h("span", { class: "nota-icono", "aria-hidden": "true", text: "🎁" }), h("span", { text: "Tu último regalo te espera. Pídeselo a " + CFG.de + "." })) : null,
      h("p", { class: "firma", text: [CFG.firma, CFG.de].filter(Boolean).join(", ") })
    );

    fin.hidden = false;
    fin.className = "final";
    fin.scrollTop = 0; $(".final-escena").scrollTop = 0;
    document.documentElement.classList.add("sin-scroll");
    $("#app").setAttribute("aria-hidden", "true");
    requestAnimationFrame(() => fin.classList.add("visible"));
    if (!escena) escena = window.Efectos.EscenaFinal($("#finalCanvas"));
    escena.iniciar();
    $("#finalCerrarX").focus({ preventScroll: true });

    // «Tú y yo» toma el protagonismo (si el archivo está disponible).
    conCancion = cancionParaEscena(F.inicioCancion || 0);
    if (!conCancion) window.Sonido.reanudarSiCorresponde();

    guion = armarGuion(fotos.length);
    pasosHechos = new Set();
    if (cielo) cielo.pausar();
    relojF = crearReloj(F.inicioCancion || 0, conCancion);
    if (quieto()) { saltarFinal(); return; }
    relojFinal = requestAnimationFrame(bucleFinal);
  }

  function saltarFinal() {
    cancelAnimationFrame(relojFinal);
    guion.forEach(p => pasosHechos.add(p.id));
    const fin = $("#final");
    [...$("#finalFotos").children].forEach(el => el.classList.add("aparece"));
    fin.classList.add("paso-entrada", "paso-fotos", "paso-corazon", "paso-carta", "paso-despedida", "paso-dedicatoria");
    if (quieto()) fin.classList.add("sin-movimiento");
    if (escena) { escena.corazon(); if (!quieto()) escena.fuegos(); }
  }

  function cerrarFinal() {
    const fin = $("#final");
    if (fin.hidden) return;
    cancelAnimationFrame(relojFinal);
    window.Sonido.cancion.soltarProtagonismo();
    fin.classList.remove("visible");
    document.documentElement.classList.remove("sin-scroll");
    $("#app").removeAttribute("aria-hidden");
    setTimeout(() => {
      fin.hidden = true;
      if (escena) escena.detener();
      if (cielo) cielo.reanudar();
      pintarTodo();
      const p = document.querySelector('.puerta[data-d="24"]');
      if (p) p.focus({ preventScroll: true });
    }, quieto() ? 0 : 600);
  }
  $("#finalCerrar").addEventListener("click", cerrarFinal);
  $("#finalCerrarX").addEventListener("click", cerrarFinal);
  $("#finalSaltar").addEventListener("click", saltarFinal);
  $("#finalRepetir").addEventListener("click", abrirFinal);
  $("#revivirHistoria").addEventListener("click", abrirFinal);
  $("#finalMusica").addEventListener("click", () => window.Sonido.alternarMusica());

  /* ======================================================================
     NUESTRO ANIVERSARIO (16 de diciembre)
     Una experiencia propia: velo de terciopelo sobre el calendario, lluvia
     de corazones, contador hasta 730 días, película de nuestras fotos al
     compás de «Tú y yo», joyero con la pulsera y la carta del día.
     Usa el mismo reproductor y el mismo reloj que el gran final.
     ====================================================================== */
  const ANIV = CFG.aniversario || {};
  const diaAniversario = () => CFG.sorpresas.findIndex(x => x && x.aniversario) + 1;
  let anivReloj = null, anivRaf = 0, anivContadorRaf = 0, anivHechos = new Set(), anivGuion = [], anivTiempos = [];

  /* ---- Videoclip: escenas al compás ------------------------------------
     [tipo, fotos, compases]: pantalla completa y Polaroid duran 2 compases
     (5,3 s); los collages de 2 y 3 fotos, 3 compases (8 s). */
  const BARRA = ANIV.fotoCada || 2.667;
  const PATRON = [["completa", 1, 2], ["duo", 2, 3], ["polaroid", 1, 2], ["trio", 3, 3]];
  let anivEscenas = [];
  const conCarpeta = !!(ANIV.fotos && ANIV.fotos.length);
  const rutaFoto = n => (conCarpeta ? (ANIV.carpeta || "") : "") + n;
  const rutaFondo = n => (conCarpeta ? (ANIV.carpeta || "") + "fondo/" + n : mini(n));
  const rutasAniversario = () => conCarpeta ? ANIV.fotos.flatMap(n => [rutaFoto(n), rutaFondo(n)]) : [];

  function barajar(lista) {
    const a = lista.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  /* Orden nuevo en cada reproducción; cada foto aparece una sola vez. */
  function armarEscenas(f0) {
    const fotos = barajar(conCarpeta ? ANIV.fotos : CFG.sorpresas.filter(x => x && x.foto).map(x => x.foto));
    const escenas = [];
    let t = f0, k = 0;
    while (fotos.length) {
      let [tipo, n, compases] = PATRON[k++ % PATRON.length];
      if (n > fotos.length) { n = fotos.length; tipo = n === 1 ? "completa" : "duo"; compases = n === 1 ? 2 : 3; }
      escenas.push({ tipo, fotos: fotos.splice(0, n), t, dur: compases * BARRA, el: null, pre: null });
      t += compases * BARRA;
    }
    return escenas;
  }
  /* Precarga progresiva: solo las 2 escenas siguientes. */
  function precargar(esc) {
    if (!esc || esc.pre) return;
    esc.pre = esc.fotos.map(n => { const i = new Image(); i.decoding = "async"; i.src = rutaFoto(n); if (i.decode) i.decode().catch(() => {}); return i; });
  }
  function crearEscena(esc) {
    if (!esc || esc.el) return;
    const el = h("div", { class: "clip escena-" + esc.tipo, style: "--dur:" + (esc.dur + 1.2).toFixed(2) + "s" });
    if (esc.tipo === "completa") el.append(h("img", { class: "clip-fondo", src: rutaFondo(esc.fotos[0]), alt: "", decoding: "async" }));
    esc.fotos.forEach((n, i) => {
      const img = h("img", { src: rutaFoto(n), alt: "", decoding: "async" });
      el.append(esc.tipo === "completa" ? h("div", { class: "clip-marco" }, img) : h("figure", { class: "clip-polaroid p" + i, style: "--i:" + i }, img));
    });
    esc.el = el; esc.pre = null;
    $("#anivVentana").append(el);
  }
  function mostrarEscena(k) {
    const esc = anivEscenas[k];
    if (!esc) return;
    crearEscena(esc); crearEscena(anivEscenas[k + 1]); precargar(anivEscenas[k + 2]);
    requestAnimationFrame(() => anivEscenas.forEach((e, i) => { if (e.el) e.el.classList.toggle("activa", i === k); }));
    // Memoria (iPhone): se retiran las escenas que ya pasaron.
    const vieja = anivEscenas[k - 2];
    if (vieja && vieja.el) { vieja.el.remove(); vieja.el = null; }
  }

  function guionAniversario(escenas) {
    const f0 = ANIV.inicioFotos != null ? ANIV.inicioFotos : 8;
    const pasos = [{ t: 0.15, id: "velo" }, { t: 0.9, id: "contador" }, { t: 4.4, id: "lluvia" }, { t: 5.6, id: "fechas" }, { t: f0 - 0.5, id: "pelicula" }];
    escenas.forEach((e, k) => pasos.push({ t: e.t, id: "escena" + k, escena: k }));
    const ultima = escenas[escenas.length - 1];
    pasos.push({ t: (ultima ? ultima.t + ultima.dur : f0) + 0.3, id: "joyero" });
    return pasos;
  }

  function contarDias() {
    const total = ANIV.dias || 730, el = $("#anivNumero"), dur = 4200, t0 = performance.now();
    cancelAnimationFrame(anivContadorRaf);
    el.classList.remove("llego");
    (function paso(t) {
      const k = Math.min(1, (t - t0) / dur), suave = 1 - Math.pow(1 - k, 3);
      el.textContent = String(Math.round(total * suave));
      if (k < 1) anivContadorRaf = requestAnimationFrame(paso);
      else { el.classList.add("llego"); window.Sonido.efecto("exito"); }
    })(t0);
  }

  function pasoAniversario(p) {
    const sec = $("#aniversario");
    if (p.escena != null) { mostrarEscena(p.escena); return; }
    switch (p.id) {
      case "velo": sec.classList.add("paso-velo"); window.Efectos.Fx.lluvia("corazones", 44); break;
      case "contador": sec.classList.add("paso-contador"); contarDias(); break;
      case "lluvia": window.Efectos.Fx.lluvia("corazones", 26); break;
      case "fechas": sec.classList.add("paso-fechas"); window.Sonido.efecto("destello"); break;
      case "pelicula": sec.classList.add("paso-pelicula"); break;
      case "joyero": sec.classList.add("paso-joyero"); $("#joyero").focus({ preventScroll: true }); break;
    }
  }

  function bucleAniversario() {
    const t = anivReloj ? anivReloj() : 0;
    for (const p of anivGuion) if (!anivHechos.has(p.id) && t >= p.t) { anivHechos.add(p.id); pasoAniversario(p); }
    if (anivHechos.size < anivGuion.length) anivRaf = requestAnimationFrame(bucleAniversario);
  }

  /* Abre el aniversario. */
  function abrirAniversario() {
    conFotos(rutasAniversario(), iniciarAniversario, () => { cancionEnElToque(ANIV.inicioCancion || 0); abrirAniversario(); });
  }
  function iniciarAniversario() {
    const d = diaAniversario();
    if (!d) return;
    const s = CFG.sorpresas[d - 1];
    const sec = $("#aniversario");
    if (sec.hidden) focoAnterior = document.activeElement;
    cancelAnimationFrame(anivRaf); cancelAnimationFrame(anivContadorRaf);
    anivTiempos.forEach(clearTimeout); anivTiempos = [];
    alternarPanelSonido(false);
    Estado.abrir(d);

    $("#anivEtiqueta").textContent = s.etiqueta || "Nuestro aniversario";
    $("#anivNumero").textContent = "0";
    $("#anivNumero").setAttribute("aria-label", (ANIV.dias || 730) + " " + (ANIV.textoDias || "días juntos"));
    $("#anivUnidad").textContent = ANIV.textoDias || "días juntos";
    $("#anivFechas").textContent = (ANIV.desde || "") + " — " + (ANIV.hasta || "");
    $("#anivRegaloTexto").textContent = ANIV.regalo || "Tu regalo";

    // Videoclip: orden nuevo cada vez; se precargan solo las primeras escenas.
    $("#anivVentana").innerHTML = "";
    anivEscenas = armarEscenas(ANIV.inicioFotos != null ? ANIV.inicioFotos : 8);
    precargar(anivEscenas[0]); precargar(anivEscenas[1]);

    // Carta de aniversario (la misma del día 16).
    const carta = $("#anivCarta");
    carta.innerHTML = "";
    carta.append(
      h("p", { class: "eyebrow", text: (ANIV.desde || "") + " — " + (ANIV.hasta || "") }),
      h("h3", { class: "aniv-titulo", text: s.titulo }),
      h("div", { class: "lineas" }, s.texto.split("\n").map((l, i) => h("p", { style: "--i:" + i, text: l }))),
      s.tipo === "regalo" ? h("div", { class: "nota-regalo" }, h("span", { class: "nota-icono", "aria-hidden": "true", text: "🎁" }), h("span", { text: "Hoy hay un regalo de verdad para ti. Pídeselo a " + CFG.de + "." })) : null,
      h("p", { class: "firma", text: [CFG.firma, CFG.de].filter(Boolean).join(", ") }),
      h("div", { class: "aniv-acciones" },
        h("button", { type: "button", class: "boton boton-oro", text: "Revivir nuestro aniversario", onclick: () => { cancionEnElToque(ANIV.inicioCancion || 0); abrirAniversario(); } }),
        h("button", { type: "button", class: "boton boton-fantasma", text: "Volver al calendario", onclick: cerrarAniversario })));

    sec.hidden = false;
    sec.className = "aniversario";
    $(".aniv-escena").scrollTop = 0;
    document.documentElement.classList.add("sin-scroll");
    $("#app").setAttribute("aria-hidden", "true");
    requestAnimationFrame(() => sec.classList.add("visible"));
    if (cielo) cielo.pausar();
    $("#anivCerrar").focus({ preventScroll: true });

    const conCancion = cancionParaEscena(ANIV.inicioCancion || 0);
    if (!conCancion) window.Sonido.reanudarSiCorresponde();
    anivReloj = crearReloj(ANIV.inicioCancion || 0, conCancion);
    anivGuion = guionAniversario(anivEscenas);
    anivHechos = new Set();
    if (quieto()) { saltarAniversario(); return; }
    anivRaf = requestAnimationFrame(bucleAniversario);
  }

  function saltarAniversario() {
    cancelAnimationFrame(anivRaf); cancelAnimationFrame(anivContadorRaf);
    anivGuion.forEach(p => anivHechos.add(p.id));
    const n = $("#anivNumero");
    n.textContent = String(ANIV.dias || 730); n.classList.add("llego");
    $("#aniversario").classList.add("paso-velo", "paso-contador", "paso-fechas", "paso-pelicula", "paso-joyero");
    $("#joyero").focus({ preventScroll: true });
  }

  function abrirJoyero() {
    const sec = $("#aniversario");
    if (!sec.classList.contains("paso-joyero") || sec.classList.contains("paso-abierto")) return;
    sec.classList.add("paso-abierto");
    window.Sonido.efecto("abrir");
    const d = diaAniversario(), datos = Estado.datos(d);
    datos.abierto = true; Estado.guardar();
    anivTiempos.push(setTimeout(() => { fx("oro", $("#joyero")); fx("corazones", $("#joyero")); window.Sonido.efecto("destello"); }, quieto() ? 0 : 650));
    anivTiempos.push(setTimeout(() => {
      sec.classList.add("paso-carta");
      $(".aniv-escena").scrollTop = 0;
      window.Sonido.efecto("papel");
      const b = sec.querySelector(".aniv-acciones .boton");
      if (b) b.focus({ preventScroll: true });
    }, quieto() ? 200 : 3400));
  }

  function cerrarAniversario() {
    const sec = $("#aniversario");
    if (sec.hidden) return;
    cancelAnimationFrame(anivRaf); cancelAnimationFrame(anivContadorRaf);
    anivTiempos.forEach(clearTimeout); anivTiempos = [];
    window.Sonido.cancion.soltarProtagonismo();
    sec.classList.remove("visible");
    document.documentElement.classList.remove("sin-scroll");
    $("#app").removeAttribute("aria-hidden");
    setTimeout(() => {
      sec.hidden = true;
      $("#anivVentana").innerHTML = ""; anivEscenas = [];
      if (cielo) cielo.reanudar();
      pintarTodo();
      const p = document.querySelector('.puerta[data-d="' + diaAniversario() + '"]');
      if (p) p.focus({ preventScroll: true });
    }, quieto() ? 0 : 600);
  }
  $("#joyero").addEventListener("click", abrirJoyero);
  $("#anivSaltar").addEventListener("click", saltarAniversario);
  $("#anivCerrar").addEventListener("click", cerrarAniversario);
  $("#anivMusica").addEventListener("click", () => window.Sonido.alternarMusica());
  $("#revivirAniversario").addEventListener("click", () => { cancionEnElToque(ANIV.inicioCancion || 0); abrirAniversario(); });

  /* Las experiencias del 16 y del 24 empiezan directamente (fotos públicas). */
  function conFotos(rutas, alListo) { alListo(); }

  /* ======================================================================
     NUESTRA CANCIÓN Y SONIDO (controles)
     ====================================================================== */
  const CAN = CFG.cancion || {};
  function alternarPanelSonido(forzar) {
    const panel = $("#panelSonido");
    const abrir = typeof forzar === "boolean" ? forzar : panel.hidden;
    panel.hidden = !abrir;
    if (abrir) { const t = window.Sonido.cancion.tiempo(), d = window.Sonido.cancion.duracion(); $("#cancionTiempo").textContent = tiempoTexto(t); $("#cancionDuracion").textContent = tiempoTexto(d); if (d) $("#cancionBarra").value = Math.round((t / d) * 1000); }
    $("#botonSonido").setAttribute("aria-expanded", String(abrir));
    $("#miniAbrir").setAttribute("aria-expanded", String(abrir));
  }
  function prepararReproductor() {
    $("#miniEtiqueta").textContent = $("#cancionEtiqueta").textContent = CAN.etiqueta || "Nuestra canción";
    $("#miniTitulo").textContent = $("#cancionTitulo").textContent = $("#viniloTexto").textContent = CAN.titulo || "";
    $("#miniArtista").textContent = $("#cancionArtista").textContent = CAN.artista || "";
    $("#cancionFrase").textContent = CAN.frase || "";
    if (CAN.enlaceOficial) { const a = $("#cancionEnlace"); a.href = CAN.enlaceOficial; a.textContent = CAN.textoEnlace || "Escúchala en su versión oficial"; }
  }
  const tiempoTexto = s => (isFinite(s) && s > 0 ? Math.floor(s / 60) + ":" + pad2(Math.floor(s % 60)) : "0:00");

  $("#botonSonido").addEventListener("click", () => { window.Sonido.despertar(); alternarPanelSonido(); });
  $("#miniAbrir").addEventListener("click", () => { window.Sonido.despertar(); alternarPanelSonido(); });
  $("#miniPlay").addEventListener("click", () => window.Sonido.cancion.alternar());
  $("#cancionPlay").addEventListener("click", () => window.Sonido.cancion.alternar());
  $("#cancionBarra").addEventListener("input", e => { const d = window.Sonido.cancion.duracion(); if (d) window.Sonido.cancion.ir((e.target.value / 1000) * d); });
  $("#sonidoMusica").addEventListener("click", () => window.Sonido.alternarCaja());
  $("#sonidoSilencio").addEventListener("click", () => window.Sonido.silenciar());
  $("#sonidoVolumen").addEventListener("input", e => window.Sonido.volumen(e.target.value / 100));
  document.addEventListener("click", e => {
    const panel = $("#panelSonido");
    if (!panel.hidden && !e.target.closest("#panelSonido, #botonSonido, #miniReproductor")) alternarPanelSonido(false);
  });
  window.Sonido.alTiempo((t, d) => {
    if (document.hidden || $("#panelSonido").hidden) return;
    $("#cancionTiempo").textContent = tiempoTexto(t);
    $("#cancionDuracion").textContent = tiempoTexto(d);
    if (d) $("#cancionBarra").value = Math.round((t / d) * 1000);
  });
  window.Sonido.alCambiar(st => {
    const hay = st.cancionDisponible !== false && !!CAN.archivo;
    const suena = hay ? st.cancionSonando : st.musica;
    document.body.classList.toggle("cancion-sonando", st.cancionSonando && !st.silencio);
    $("#miniReproductor").hidden = !hay || $("#app").hidden;
    $("#bloqueCancion").classList.toggle("sin-archivo", !hay);
    $("#cancionEnlace").hidden = hay || !CAN.enlaceOficial;
    ["#miniPlay", "#cancionPlay"].forEach(id => {
      $(id).classList.toggle("pausa", st.cancionSonando);
      $(id).setAttribute("aria-label", (st.cancionSonando ? "Pausar" : "Reproducir") + " nuestra canción");
    });
    $("#sonidoMusica").setAttribute("aria-pressed", String(st.musica));
    $("#sonidoMusica").querySelector("span").textContent = st.musica ? "Pausar la caja de música" : "Caja de música navideña";
    $("#sonidoSilencio").setAttribute("aria-pressed", String(st.silencio));
    $("#sonidoSilencio").querySelector("span").textContent = st.silencio ? "Activar el sonido" : "Silenciar todo";
    $("#sonidoVolumen").value = Math.round(st.volumen * 100);
    $("#botonSonido").classList.toggle("sonando", suena && !st.silencio);
    $("#botonSonido").classList.toggle("silencio", st.silencio);
    document.querySelectorAll(".chip-musica").forEach(b => {
      b.setAttribute("aria-pressed", String(suena));
      b.textContent = suena ? "♪ Pausar música" : hay ? "♪ Nuestra canción" : "♪ Música";
    });
  });
  prepararReproductor();
  /* iPhone: al volver de la pantalla bloqueada u otra app, el audio puede
     quedar en silencio; cualquier toque lo recupera. */
  ["pointerup", "touchend"].forEach(tipo => document.addEventListener(tipo, () => window.Sonido.despertar(), { passive: true, capture: true }));

  /* Si una foto no carga: un reintento y, si sigue fallando, se oculta su marco. */
  document.addEventListener("error", e => {
    const img = e.target;
    if (!img || img.tagName !== "IMG") return;
    if (!img.dataset.reintento) {
      img.dataset.reintento = "1";
      const src = img.getAttribute("src") || "";
      setTimeout(() => { img.src = src + (src.indexOf("?") > -1 ? "&" : "?") + "r=1"; }, 1500);
      return;
    }
    const marco = img.closest(".polaroid, .album-polaroid, .final-polaroid, .clip-marco, .clip-polaroid");
    (marco || img).classList.add("foto-ausente");
  }, true);

  /* Si ella ya escuchaba la canción, la retomamos con su primer toque. */
  document.addEventListener("pointerdown", function primerToque(e) {
    if (e.target.closest("#miniPlay, #cancionPlay, #sonidoSilencio, #finalMusica, #introComenzar, #introOmitir")) return;
    document.removeEventListener("pointerdown", primerToque, true);
    window.Sonido.reanudarSiCorresponde();
  }, true);

  /* ======================================================================
     SECRETOS (easter eggs)
     ====================================================================== */
  const SECRETOS = { corazon: "el corazón escondido", estrella: "la estrella del árbol", moca: "las huellitas de Moca" };
  function encontrarSecreto(id, mensaje) {
    const e = Estado.get();
    const nuevo = !e.secretos.includes(id);
    if (nuevo) { e.secretos.push(id); Estado.guardar(); }
    aviso((nuevo ? "Secreto encontrado: " : "") + mensaje, 5000);
    pintarSecretos();
  }
  function pintarSecretos() {
    const n = Estado.get().secretos.length, total = Object.keys(SECRETOS).length;
    $("#secretos").textContent = n === 0 ? "Hay " + total + " secretos escondidos en esta página ✨" : n === total ? "Encontraste los " + total + " secretos. Eres la mejor ✨" : "Secretos encontrados: " + n + " de " + total;
  }
  function contadorToques(necesarios, accion) {
    let n = 0, t;
    return () => { n++; clearTimeout(t); t = setTimeout(() => (n = 0), 1600); if (n >= necesarios) { n = 0; accion(); } };
  }
  const tocarCorazon = contadorToques(5, () => {
    window.Efectos.Fx.lluvia("corazones", 50); window.Sonido.efecto("exito");
    encontrarSecreto("corazon", CFG.final.cierre + " 💗");
  });
  $("#corazonSecreto").addEventListener("click", e => { window.Sonido.efecto("toque"); fx("corazones", e.currentTarget); tocarCorazon(); });
  const secretoEstrella = contadorToques(3, () => {
    window.Efectos.Fx.lluvia("estrellas", 50); if (cielo) cielo.tormenta(5000); window.Sonido.efecto("destello");
    encontrarSecreto("estrella", "Encontraste la estrella del árbol. Pide un deseo ✨");
  });
  function secretoMoca() {
    window.Efectos.Fx.lluvia("huellas", 36); window.Sonido.efecto("destello");
    encontrarSecreto("moca", "Moca aprueba este calendario 🐾");
  }
  $("#huellita").addEventListener("click", secretoMoca);
  let tecleo = "";
  document.addEventListener("keydown", e => {
    if (e.key.length !== 1) return;
    tecleo = (tecleo + e.key.toLowerCase()).slice(-4);
    if (tecleo === "moca") secretoMoca();
  });

  /* ======================================================================
     MODO PRUEBA (solo si produccion: false y la dirección termina en #probar)
     ====================================================================== */
  function prepararPruebas() {
    if (!MODO_PRUEBA) return;
    const panel = $("#panelPruebas");
    panel.hidden = false;
    const sel = $("#pruebaFecha");
    const opciones = [["todas", "Todas las puertas abiertas"], ["nov", "30 nov, 23:59:50 (cuenta regresiva)"]];
    for (let d = 1; d <= TOTAL; d++) opciones.push(["d" + d, d + " de diciembre, 00:00"]);
    opciones.push(["navidad", "25 de diciembre (Navidad)"]);
    opciones.forEach(([v, t]) => sel.append(h("option", { value: v, text: t })));
    let elegida = "todas";
    try { elegida = sessionStorage.getItem("adri-prueba") || "todas"; } catch (e) {}
    sel.value = elegida;
    aplicar(elegida);
    sel.addEventListener("change", () => { try { sessionStorage.setItem("adri-prueba", sel.value); } catch (e) {} aplicar(sel.value); ultimoDisponible = -1; pintarTodo(); pintarCuenta(); });
    $("#pruebaReiniciar").addEventListener("click", () => { Estado.reiniciar(); pintarTodo(); pintarSecretos(); aviso("Progreso reiniciado."); });
    $("#pruebaIntro").addEventListener("click", mostrarIntro);
    $("#pruebaFinal").addEventListener("click", abrirFinal);
    $("#pruebaOcultar").addEventListener("click", e => {
      const plegado = panel.classList.toggle("plegado");
      e.currentTarget.textContent = plegado ? "abrir" : "ocultar";
      e.currentTarget.setAttribute("aria-expanded", String(!plegado));
    });

    function aplicar(v) {
      const inicio = Date.now();
      let base;
      if (v === "todas") base = Tiempo.apertura(TOTAL) + 3600e3;
      else if (v === "nov") base = Tiempo.apertura(1) - 10e3;
      else if (v === "navidad") base = Tiempo.navidad + 10 * 3600e3;
      else base = Tiempo.apertura(+v.slice(1)) + 5e3;
      // El tiempo simulado avanza solo, para ver la cuenta regresiva en acción.
      simulado = base;
      clearInterval(aplicar.t);
      aplicar.t = setInterval(() => { simulado = base + (Date.now() - inicio); }, 250);
    }
  }

  /* ======================================================================
     PWA (instalar en el celular)
     ====================================================================== */
  let promptInstalar = null;
  const esStandalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); promptInstalar = e; $("#instalar").hidden = false; });
  if (esIOS && !esStandalone()) $("#instalar").hidden = false;
  $("#instalar").addEventListener("click", async () => {
    if (promptInstalar) { promptInstalar.prompt(); try { await promptInstalar.userChoice; } catch (e) {} promptInstalar = null; $("#instalar").hidden = true; }
    else aviso("En Safari toca el botón Compartir y luego «Agregar a pantalla de inicio» 📲", 6500);
  });
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  /* ======================================================================
     NAVEGACIÓN INFERIOR
     ====================================================================== */
  document.querySelectorAll("#barraNav a").forEach(a => a.addEventListener("click", e => {
    const destino = document.querySelector(a.getAttribute("href"));
    if (!destino) return;
    e.preventDefault();
    destino.scrollIntoView({ behavior: quieto() ? "auto" : "smooth", block: "start" });
  }));
  if ("IntersectionObserver" in window) {
    const enlaces = [...document.querySelectorAll("#barraNav a")];
    const io = new IntersectionObserver(entradas => {
      entradas.forEach(en => {
        if (!en.isIntersecting) return;
        enlaces.forEach(a => a.classList.toggle("activo", a.getAttribute("href") === "#" + en.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["calendario", "arbol", "universo"].forEach(id => io.observe(document.getElementById(id)));
  }
  $("#verIntro").addEventListener("click", mostrarIntro);

  /* ======================================================================
     ARRANQUE
     ====================================================================== */
  let cielo = null;
  function iniciar() {
    window.Efectos.Fx.iniciar($("#fx"));
    cielo = window.Efectos.Cielo($("#cielo"));
    prepararPruebas();
    const e = Estado.get();
    e.visitas = (e.visitas || 0) + 1; Estado.guardar();
    pintarSecretos();
    document.body.classList.remove("cargando");
    if (!e.introVista) mostrarIntro();
    else { entrarApp(false); setTimeout(saludoDeRegreso, 700); }
    pintarCuenta();
    setInterval(() => { if (!document.hidden && !$("#app").hidden) pintarCuenta(); }, 1000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden && !$("#app").hidden) { pintarTodo(); pintarCuenta(); } });
    addEventListener("hashchange", () => location.reload());
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
