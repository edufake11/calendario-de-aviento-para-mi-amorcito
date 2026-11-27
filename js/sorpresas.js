/* ==========================================================================
   SORPRESAS · un componente por tipo. Cada uno recibe la sorpresa (s) y un
   contexto (ctx) y devuelve un elemento listo para mostrar.

   ctx = { dia, datos, guardar(), sonido(nombre), fx(tipo, elemento),
           atenuar(bool), firma, de, para, revivirFinal() }
   ========================================================================== */
(function () {
  "use strict";

  /* Pequeño ayudante para crear elementos. */
  function h(tag, props, ...hijos) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k === "style") el.setAttribute("style", v);
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const c of hijos.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
    return el;
  }

  const MESES = "diciembre";
  const fecha = d => d + " de " + MESES;

  function lineas(texto) {
    return h("div", { class: "lineas" }, String(texto || "").split("\n").map((l, i) => h("p", { style: "--i:" + i, text: l })));
  }

  function polaroid(src, pie, extra) {
    if (!src) return null;
    return h("figure", { class: "polaroid " + (extra || "") },
      h("img", { src: src, alt: pie || "Nuestra foto", decoding: "async" }),
      pie ? h("figcaption", { text: pie }) : null);
  }

  function notaRegalo(ctx) {
    return h("div", { class: "nota-regalo" },
      h("span", { class: "nota-icono", "aria-hidden": "true", text: "🎁" }),
      h("span", { text: "Hoy hay un regalo de verdad para ti. Pídeselo a " + ctx.de + "." }));
  }

  /* Contenido común: título, texto en líneas y foto Polaroid. */
  function contenido(s, ctx, opciones) {
    const o = Object.assign({ foto: true, nota: false }, opciones);
    return h("div", { class: "revelado" },
      h("h3", { class: "titulo-sorpresa", text: s.titulo }),
      lineas(s.texto),
      o.foto && s.foto ? polaroid(s.foto, fecha(ctx.dia), "revela") : null,
      o.nota ? notaRegalo(ctx) : null);
  }

  /* Botón discreto para saltar un juego. */
  function saltar(texto, accion) {
    return h("button", { type: "button", class: "enlace-saltar", onclick: accion, text: texto });
  }

  /* -------------------------------------------------------------- CARTA */
  function carta(s, ctx) {
    ctx.sonido("papel");
    return h("div", { class: "carta-animada" },
      h("div", { class: "sello-cera", "aria-hidden": "true" }, h("span", { text: ctx.para.charAt(0) })),
      h("div", { class: "papel" }, contenido(s, ctx, { foto: false })),
      s.foto ? polaroid(s.foto, fecha(ctx.dia), "revela") : null);
  }

  /* --------------------------------------------------------------- VALE */
  function vale(s, ctx) {
    const sello = h("div", { class: "sello-canje", "aria-hidden": "true", text: "Canjeado ♥" });
    const estado = h("p", { class: "cupon-estado", "aria-live": "polite" });
    const boton = h("button", { type: "button", class: "boton boton-fantasma" });
    const raiz = h("div", { class: "cupon-envoltura" },
      h("div", { class: "cupon" },
        h("div", { class: "cupon-talon" },
          h("span", { class: "cupon-eti", text: "Cupón" }),
          h("span", { class: "cupon-num", text: "N.º " + String(ctx.dia).padStart(2, "0") })),
        h("div", { class: "cupon-cuerpo" },
          h("span", { class: "cupon-eti", text: "Vale personal para " + ctx.para }),
          h("h3", { class: "titulo-sorpresa", text: s.titulo }),
          lineas(s.texto),
          h("span", { class: "cupon-letra", text: "Canjeable cuando tú quieras · sin fecha de vencimiento" })),
        sello),
      h("div", { class: "cupon-acciones" }, boton, estado));
    function pintar() {
      raiz.classList.toggle("canjeado", !!ctx.datos.canjeado);
      boton.textContent = ctx.datos.canjeado ? "Desmarcar" : "Marcar como canjeado";
      estado.textContent = ctx.datos.canjeado ? "Canjeado el " + ctx.datos.canjeado + ". ¡Que lo disfrutes!" : "";
    }
    boton.addEventListener("click", () => {
      ctx.datos.canjeado = ctx.datos.canjeado ? null : new Date().toLocaleDateString("es-PE", { day: "numeric", month: "long" });
      ctx.guardar(); pintar();
      if (ctx.datos.canjeado) { ctx.sonido("exito"); ctx.fx("corazones", sello); }
    });
    pintar();
    return raiz;
  }

  /* ------------------------------------------------------------- REGALO */
  function regalo(s, ctx) {
    const revelado = contenido(s, ctx, { nota: true });
    const caja = h("button", { type: "button", class: "caja-regalo", "aria-label": "Abrir el regalo" },
      h("span", { class: "caja-rayos", "aria-hidden": "true" }),
      h("span", { class: "caja-tapa", "aria-hidden": "true" }, h("span", { class: "caja-lazo" })),
      h("span", { class: "caja-cuerpo", "aria-hidden": "true" }),
      h("span", { class: "caja-pista", text: "Toca para abrir tu regalo" }));
    const raiz = h("div", { class: "regalo" + (ctx.datos.abierto ? " abierto" : "") }, caja, revelado);
    caja.addEventListener("click", () => {
      if (raiz.classList.contains("abierto")) return;
      raiz.classList.add("abriendo");
      ctx.sonido("abrir");
      setTimeout(() => {
        raiz.classList.add("abierto");
        ctx.fx("oro", caja);
        ctx.datos.abierto = true; ctx.guardar();
      }, window.Efectos && window.Efectos.quieto() ? 0 : 750);
    });
    return raiz;
  }

  /* ------------------------------------------------------- ROMPECABEZAS */
  function rompecabezas(s, ctx) {
    const N = 3, total = N * N;
    let orden = [...Array(total).keys()], elegida = null, movimientos = 0;
    if (!ctx.datos.resuelto) {
      do { for (let i = total - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [orden[i], orden[j]] = [orden[j], orden[i]]; } }
      while (orden.every((v, i) => v === i));
    }
    // Una <img> oculta carga la foto y las piezas la usan como fondo cuando ya cargó.
    let fotoAbs = "";
    const fuente = h("img", { src: s.foto, alt: "", hidden: true, onload: () => { fotoAbs = fuente.currentSrc || fuente.src; pintar(); } });
    const tablero = h("div", { class: "tablero-puzzle", style: "aspect-ratio:" + (s.aspecto || "3 / 4"), role: "group", "aria-label": "Rompecabezas de 9 piezas" });
    const info = h("p", { class: "juego-info", "aria-live": "polite", text: "Toca dos piezas para cambiarlas de lugar." });
    const revelado = contenido(s, ctx, { foto: false });
    const raiz = h("div", { class: "juego" + (ctx.datos.resuelto ? " resuelto" : "") },
      h("p", { class: "juego-titulo", text: "Arma nuestra foto para leer tu sorpresa" }), fuente, tablero, info,
      saltar("Mostrar la foto armada", () => terminar(true)), revelado);

    function pintar() {
      tablero.innerHTML = "";
      orden.forEach((pieza, pos) => {
        const x = (pieza % N) * 50, y = Math.floor(pieza / N) * 50;
        tablero.append(h("button", {
          type: "button", class: "pieza" + (elegida === pos ? " elegida" : ""), style: (fotoAbs ? 'background-image:url("' + fotoAbs + '");' : "") + 'background-position:' + x + "% " + y + "%",
          "aria-label": "Pieza " + (pos + 1), onclick: () => tocar(pos)
        }));
      });
    }
    function tocar(pos) {
      if (raiz.classList.contains("resuelto")) return;
      ctx.sonido("toque");
      if (elegida === null) { elegida = pos; pintar(); return; }
      if (elegida !== pos) { [orden[elegida], orden[pos]] = [orden[pos], orden[elegida]]; movimientos++; info.textContent = movimientos + (movimientos === 1 ? " movimiento" : " movimientos"); }
      elegida = null; pintar();
      if (orden.every((v, i) => v === i)) terminar(false);
    }
    function terminar(saltado) {
      orden = [...Array(total).keys()]; elegida = null; pintar();
      raiz.classList.add("resuelto");
      info.textContent = saltado ? "" : "¡Lo armaste en " + movimientos + " movimientos!";
      ctx.datos.resuelto = true; ctx.guardar();
      ctx.sonido("exito"); ctx.fx("estrellas", tablero);
    }
    pintar();
    return raiz;
  }

  /* ------------------------------------------------------------ MEMORIA */
  function memoria(s, ctx) {
    const fotos = (s.fotos || []).slice(0, 6);
    let cartas = fotos.concat(fotos).map((src, i) => ({ src, par: i % fotos.length }));
    for (let i = cartas.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cartas[i], cartas[j]] = [cartas[j], cartas[i]]; }
    let vueltas = [], bloqueo = false, intentos = 0, pares = 0;
    const tablero = h("div", { class: "tablero-memoria", role: "group", "aria-label": "Juego de memoria" });
    const info = h("p", { class: "juego-info", "aria-live": "polite", text: "Encuentra las parejas de fotos." });
    const revelado = contenido(s, ctx);
    const raiz = h("div", { class: "juego" + (ctx.datos.resuelto ? " resuelto" : "") },
      h("p", { class: "juego-titulo", text: "Un jueguito antes de tu sorpresa" }), tablero, info,
      saltar("Saltar el juego", () => fin(true)), revelado);

    const botones = cartas.map((c, i) => {
      const b = h("button", { type: "button", class: "carta-memoria", "aria-label": "Carta " + (i + 1) },
        h("span", { class: "cara dorso", "aria-hidden": "true" }),
        h("span", { class: "cara frente" }, h("img", { src: c.src, alt: "", decoding: "async" })));
      b.addEventListener("click", () => voltear(i));
      tablero.append(b);
      return b;
    });
    function voltear(i) {
      const b = botones[i];
      if (bloqueo || b.classList.contains("volteada") || raiz.classList.contains("resuelto")) return;
      ctx.sonido("toque");
      b.classList.add("volteada"); vueltas.push(i);
      if (vueltas.length < 2) return;
      intentos++;
      const [a, c] = vueltas;
      if (cartas[a].par === cartas[c].par) {
        botones[a].classList.add("pareja"); botones[c].classList.add("pareja");
        vueltas = []; pares++;
        ctx.sonido("destello");
        if (pares === fotos.length) fin(false);
      } else {
        bloqueo = true;
        setTimeout(() => { botones[a].classList.remove("volteada"); botones[c].classList.remove("volteada"); vueltas = []; bloqueo = false; }, 850);
      }
      info.textContent = pares + " de " + fotos.length + " parejas · " + intentos + " intentos";
    }
    function fin(saltado) {
      botones.forEach(b => b.classList.add("volteada", "pareja"));
      raiz.classList.add("resuelto");
      if (!saltado) info.textContent = "¡Todas las parejas en " + intentos + " intentos!";
      ctx.datos.resuelto = true; ctx.guardar();
      ctx.sonido("exito"); ctx.fx("corazones", tablero);
    }
    if (ctx.datos.resuelto) botones.forEach(b => b.classList.add("volteada", "pareja"));
    return raiz;
  }

  /* ------------------------------------------------------- CONSTELACIÓN */
  function constelacion(s, ctx) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 300 270"); svg.setAttribute("class", "constelacion");
    svg.setAttribute("role", "group"); svg.setAttribute("aria-label", "Constelación: toca las estrellas en orden");
    const pts = [];
    const n = 12;
    for (let i = 0; i < n; i++) {
      const t = Math.PI + (i / n) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      pts.push([150 + x * 7.6, 128 - y * 7.6]);
    }
    const lineasG = document.createElementNS(NS, "g"); svg.append(lineasG);
    let siguiente = 0;
    const estrellas = pts.map(([x, y], i) => {
      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "astro"); g.setAttribute("tabindex", "0"); g.setAttribute("role", "button");
      g.setAttribute("aria-label", "Estrella " + (i + 1));
      g.innerHTML = '<circle class="halo" cx="' + x + '" cy="' + y + '" r="16"/><circle class="nucleo" cx="' + x + '" cy="' + y + '" r="4.5"/>';
      const accion = () => tocar(i);
      g.addEventListener("click", accion);
      g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); accion(); } });
      svg.append(g);
      return g;
    });
    const info = h("p", { class: "juego-info", "aria-live": "polite", text: "Toca la estrella que brilla y une nuestra constelación." });
    const revelado = contenido(s, ctx);
    const raiz = h("div", { class: "juego" + (ctx.datos.resuelto ? " resuelto" : "") },
      h("p", { class: "juego-titulo", text: "Une las estrellas" }), svg, info,
      saltar("Dibujarla por mí", () => fin(true)), revelado);

    function linea(a, b) {
      const l = document.createElementNS(NS, "line");
      l.setAttribute("x1", pts[a][0]); l.setAttribute("y1", pts[a][1]); l.setAttribute("x2", pts[b][0]); l.setAttribute("y2", pts[b][1]);
      lineasG.append(l);
    }
    function marcar() { estrellas.forEach((e, i) => { e.classList.toggle("encendida", i < siguiente); e.classList.toggle("siguiente", i === siguiente); }); }
    function tocar(i) {
      if (raiz.classList.contains("resuelto")) return;
      if (i !== siguiente) { ctx.sonido("bloqueado"); return; }
      ctx.sonido("toque");
      if (i > 0) linea(i - 1, i);
      siguiente++;
      if (siguiente === n) { linea(n - 1, 0); fin(false); } else marcar();
    }
    function fin(saltado) {
      lineasG.innerHTML = ""; for (let i = 0; i < n; i++) linea(i, (i + 1) % n);
      siguiente = n; marcar(); svg.classList.add("completa");
      raiz.classList.add("resuelto");
      info.textContent = saltado ? "" : "Así brilla lo nuestro.";
      ctx.datos.resuelto = true; ctx.guardar();
      ctx.sonido("exito"); ctx.fx("estrellas", svg);
    }
    if (ctx.datos.resuelto) fin(true); else marcar();
    return raiz;
  }

  /* ------------------------------------------------------- PLANTILLAS */
  function galeria(s, ctx) {
    return h("div", { class: "revelado" },
      h("h3", { class: "titulo-sorpresa", text: s.titulo }), lineas(s.texto),
      h("div", { class: "galeria-polaroid" }, (s.fotos || []).map((f, i) => polaroid(f.src || f, f.pie || "", "g" + (i % 4)))));
  }

  function pregunta(s, ctx) {
    const respuesta = h("p", { class: "juego-info", "aria-live": "polite" });
    const revelado = h("div", { class: "revelado" }, lineas(s.texto));
    const raiz = h("div", { class: "juego" + (ctx.datos.resuelto ? " resuelto" : "") },
      h("h3", { class: "titulo-sorpresa", text: s.titulo }),
      h("p", { class: "pregunta-texto", text: s.pregunta }),
      h("div", { class: "opciones" }, (s.opciones || []).map((op, i) => h("button", {
        type: "button", class: "boton boton-fantasma", text: op,
        onclick: e => {
          if (i === s.correcta) { respuesta.textContent = s.acierto || "¡Correcto!"; raiz.classList.add("resuelto"); ctx.datos.resuelto = true; ctx.guardar(); ctx.sonido("exito"); ctx.fx("corazones", e.currentTarget); }
          else { respuesta.textContent = s.fallo || "Casi… inténtalo otra vez"; ctx.sonido("bloqueado"); e.currentTarget.classList.add("temblor"); setTimeout(() => e.currentTarget.classList.remove("temblor"), 500); }
        }
      }))), respuesta, revelado);
    return raiz;
  }

  function audio(s, ctx) {
    const a = h("audio", { src: s.src, preload: "metadata" });
    const boton = h("button", { type: "button", class: "boton-play", "aria-label": "Reproducir" });
    const barra = h("input", { type: "range", min: "0", max: "100", value: "0", class: "barra-audio", "aria-label": "Avance del mensaje" });
    const tiempo = h("span", { class: "tiempo-audio", text: "0:00" });
    const fmt = t => Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0");
    boton.addEventListener("click", () => { if (a.paused) a.play().catch(() => {}); else a.pause(); });
    a.addEventListener("play", () => { boton.classList.add("pausa"); boton.setAttribute("aria-label", "Pausar"); ctx.atenuar(true); });
    a.addEventListener("pause", () => { boton.classList.remove("pausa"); boton.setAttribute("aria-label", "Reproducir"); ctx.atenuar(false); });
    a.addEventListener("ended", () => ctx.atenuar(false));
    a.addEventListener("timeupdate", () => { if (a.duration) barra.value = (a.currentTime / a.duration) * 100; tiempo.textContent = fmt(a.currentTime); });
    barra.addEventListener("input", () => { if (a.duration) a.currentTime = (barra.value / 100) * a.duration; });
    return h("div", { class: "revelado" }, h("h3", { class: "titulo-sorpresa", text: s.titulo }),
      h("div", { class: "reproductor" }, boton, barra, tiempo, a), lineas(s.texto));
  }

  function video(s, ctx) {
    const v = h("video", { class: "video-recuerdo", src: s.src, poster: s.poster, controls: true, playsinline: true, preload: "metadata" });
    v.addEventListener("play", () => ctx.atenuar(true));
    v.addEventListener("pause", () => ctx.atenuar(false));
    v.addEventListener("ended", () => ctx.atenuar(false));
    return h("div", { class: "revelado" }, h("h3", { class: "titulo-sorpresa", text: s.titulo }), v, lineas(s.texto));
  }

  function playlist(s, ctx) {
    return h("div", { class: "revelado" }, h("h3", { class: "titulo-sorpresa", text: s.titulo }), lineas(s.texto),
      h("ol", { class: "playlist" }, (s.canciones || []).map(c => h("li", {},
        h("a", { href: c.enlace, target: "_blank", rel: "noopener" }, h("strong", { text: c.titulo }), h("span", { text: c.artista || "" }))))));
  }

  /* Día 24 en el álbum: una tarjeta que invita a revivir el final. */
  function final(s, ctx) {
    return h("div", { class: "revelado" },
      h("h3", { class: "titulo-sorpresa", text: s.titulo }), lineas(s.texto),
      s.foto ? polaroid(s.foto, fecha(ctx.dia), "revela") : null,
      s.regalo ? notaRegalo(ctx) : null,
      h("button", { type: "button", class: "boton boton-oro", onclick: () => ctx.revivirFinal && ctx.revivirFinal(), text: "Volver a vivir nuestra historia" }));
  }

  const TIPOS = { carta, vale, regalo, rompecabezas, memoria, constelacion, galeria, pregunta, audio, video, playlist, final };

  window.Sorpresas = {
    h,
    crear(s, ctx) { return (TIPOS[s.tipo] || carta)(s, ctx); },
    etiqueta(tipo) {
      return { carta: "Carta", vale: "Cupón", regalo: "Tu regalo", rompecabezas: "Rompecabezas", memoria: "Juego de memoria", constelacion: "Constelación", galeria: "Galería", pregunta: "Pregunta", audio: "Mensaje de voz", video: "Video", playlist: "Playlist", final: "Gran final" }[tipo] || "Sorpresa";
    }
  };
})();
