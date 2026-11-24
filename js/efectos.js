/* ==========================================================================
   EFECTOS · cielo de fondo (estrellas, nieve y polvo dorado), ráfagas al
   abrir sorpresas y la escena del gran final (corazón de partículas y
   fuegos artificiales). Todo en <canvas>, sin librerías.
   ========================================================================== */
(function () {
  "use strict";

  const quieto = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DPR = () => Math.min(window.devicePixelRatio || 1, 2);
  const azar = (a, b) => a + Math.random() * (b - a);
  const ORO = ["#f0d79a", "#d4af6a", "#fff3d6"];
  const MEZCLA = ["#f0d79a", "#d4af6a", "#fff3d6", "#c43a52", "#f6ecdc"];

  function ajustar(cv) {
    const r = DPR(), w = cv.clientWidth || innerWidth, h = cv.clientHeight || innerHeight;
    cv.width = Math.round(w * r); cv.height = Math.round(h * r);
    const c = cv.getContext("2d"); c.setTransform(r, 0, 0, r, 0, 0);
    return { c, w, h };
  }

  /* ------------------------------------------------------------------ */
  /* Cielo de fondo                                                      */
  /* ------------------------------------------------------------------ */
  function Cielo(cv, opciones) {
    const o = Object.assign({ estrellas: 1, nieve: 1, polvo: 1 }, opciones || {});
    let g, estrellas = [], copos = [], polvo = [], raf = 0, activo = true, intensidad = 1;

    function sembrar() {
      g = ajustar(cv);
      const area = g.w * g.h;
      estrellas = Array.from({ length: Math.min(220, Math.round(area / 5200 * o.estrellas)) }, () => ({
        x: Math.random() * g.w, y: Math.random() * g.h, r: azar(0.3, 1.25), f: azar(0, 6.28), v: azar(0.4, 1.6)
      }));
      copos = Array.from({ length: Math.min(70, Math.round(area / 16000 * o.nieve)) }, () => nuevoCopo(true));
      polvo = Array.from({ length: Math.min(40, Math.round(area / 26000 * o.polvo)) }, () => nuevoPolvo(true));
    }
    function nuevoCopo(inicio) { return { x: Math.random() * g.w, y: inicio ? Math.random() * g.h : -8, r: azar(0.8, 2.4), v: azar(0.25, 0.8), d: azar(0, 6.28) }; }
    function nuevoPolvo(inicio) { return { x: Math.random() * g.w, y: inicio ? Math.random() * g.h : g.h + 8, r: azar(0.6, 1.8), v: azar(0.12, 0.4), f: azar(0, 6.28) }; }

    function dibujar(t) {
      const c = g.c;
      c.clearRect(0, 0, g.w, g.h);
      for (const s of estrellas) {
        const a = quieto() ? 0.7 : 0.35 + 0.65 * Math.abs(Math.sin(t * 0.001 * s.v + s.f));
        c.globalAlpha = a * 0.9;
        c.fillStyle = "#fff6e4";
        c.beginPath(); c.arc(s.x, s.y, s.r, 0, 6.283); c.fill();
        if (s.r > 1.1) { c.globalAlpha = a * 0.25; c.fillRect(s.x - s.r * 3, s.y - 0.3, s.r * 6, 0.6); c.fillRect(s.x - 0.3, s.y - s.r * 3, 0.6, s.r * 6); }
      }
      for (const p of copos) {
        if (!quieto()) { p.y += p.v * intensidad; p.x += Math.sin(t * 0.0006 + p.d) * 0.25; if (p.y > g.h + 8) Object.assign(p, nuevoCopo(false)); }
        c.globalAlpha = 0.55; c.fillStyle = "#fbf5ea";
        c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill();
      }
      for (const p of polvo) {
        if (!quieto()) { p.y -= p.v; p.x += Math.sin(t * 0.0008 + p.f) * 0.2; if (p.y < -8) Object.assign(p, nuevoPolvo(false)); }
        const a = 0.3 + 0.5 * Math.abs(Math.sin(t * 0.002 + p.f));
        c.globalAlpha = a; c.fillStyle = "#e9c886";
        c.shadowColor = "#e9c886"; c.shadowBlur = 6;
        c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill();
        c.shadowBlur = 0;
      }
      c.globalAlpha = 1;
    }

    function bucle(t) { if (!activo) return; dibujar(t); raf = requestAnimationFrame(bucle); }

    sembrar();
    if (quieto()) dibujar(0); else raf = requestAnimationFrame(bucle);
    let espera;
    addEventListener("resize", () => { clearTimeout(espera); espera = setTimeout(() => { sembrar(); if (quieto()) dibujar(0); }, 150); });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { activo = false; cancelAnimationFrame(raf); }
      else if (!quieto()) { activo = true; raf = requestAnimationFrame(bucle); }
    });
    return {
      tormenta(ms) { intensidad = 5; setTimeout(() => (intensidad = 1), ms || 4000); },
      detener() { activo = false; cancelAnimationFrame(raf); }
    };
  }

  /* ------------------------------------------------------------------ */
  /* Ráfagas (sobre todo lo demás)                                       */
  /* ------------------------------------------------------------------ */
  const Fx = (function () {
    let cv, g, piezas = [], raf = 0;
    function iniciar(el) { cv = el; g = ajustar(cv); addEventListener("resize", () => (g = ajustar(cv))); }
    function forma(c, p) {
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.globalAlpha = Math.max(0, p.vida);
      c.fillStyle = p.color;
      if (p.tipo === "corazon") {
        const s = p.r / 10; c.scale(s, s);
        c.beginPath(); c.moveTo(0, 3); c.bezierCurveTo(-10, -5, -4, -12, 0, -6); c.bezierCurveTo(4, -12, 10, -5, 0, 3); c.fill();
      } else if (p.tipo === "estrella") {
        c.beginPath();
        for (let i = 0; i < 10; i++) { const r = i % 2 ? p.r * 0.45 : p.r, a = i * Math.PI / 5; c.lineTo(Math.sin(a) * r, -Math.cos(a) * r); }
        c.closePath(); c.fill();
      } else if (p.tipo === "huella") {
        c.beginPath(); c.ellipse(0, 2, p.r * 0.55, p.r * 0.45, 0, 0, 6.283); c.fill();
        [[-0.6, -0.5], [-0.2, -0.85], [0.2, -0.85], [0.6, -0.5]].forEach(([x, y]) => { c.beginPath(); c.arc(x * p.r, y * p.r, p.r * 0.2, 0, 6.283); c.fill(); });
      } else if (p.tipo === "papel") {
        c.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8);
      } else {
        c.shadowColor = p.color; c.shadowBlur = 8;
        c.beginPath(); c.arc(0, 0, p.r * 0.5, 0, 6.283); c.fill();
      }
      c.restore();
    }
    function bucle() {
      g.c.clearRect(0, 0, g.w, g.h);
      piezas = piezas.filter(p => p.vida > 0);
      for (const p of piezas) {
        p.vx *= 0.985; p.vy = p.vy * 0.985 + p.gravedad;
        p.x += p.vx; p.y += p.vy; p.rot += p.giro; p.vida -= p.decae;
        forma(g.c, p);
      }
      if (piezas.length) raf = requestAnimationFrame(bucle); else { raf = 0; g.c.clearRect(0, 0, g.w, g.h); }
    }
    function lanzar(tipo, x, y, n) {
      if (!cv || quieto()) return;
      x = x ?? g.w / 2; y = y ?? g.h / 2;
      const config = {
        oro: { forma: "punto", colores: ORO, n: 70, vel: 6, grav: 0.05 },
        estrellas: { forma: "estrella", colores: ORO, n: 36, vel: 5, grav: 0.04 },
        corazones: { forma: "corazon", colores: ["#c43a52", "#a3283d", "#f0d79a", "#f6ecdc"], n: 34, vel: 5, grav: 0.06 },
        nieve: { forma: "punto", colores: ["#ffffff", "#f6ecdc"], n: 60, vel: 4, grav: 0.02 },
        confeti: { forma: "papel", colores: MEZCLA, n: 90, vel: 8, grav: 0.14 },
        huellas: { forma: "huella", colores: ["#d4af6a", "#f6ecdc", "#a3283d"], n: 22, vel: 4, grav: 0.05 }
      }[tipo] || { forma: "punto", colores: ORO, n: 60, vel: 6, grav: 0.05 };
      const total = n || config.n;
      for (let i = 0; i < total; i++) {
        const a = Math.random() * 6.283, v = azar(0.3, 1) * config.vel;
        piezas.push({
          x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - config.vel * 0.35,
          r: azar(4, 9), rot: azar(0, 6.28), giro: azar(-0.15, 0.15), vida: 1, decae: azar(0.008, 0.016),
          gravedad: config.grav, color: config.colores[i % config.colores.length], tipo: config.forma
        });
      }
      if (!raf) raf = requestAnimationFrame(bucle);
    }
    function lluvia(tipo, n) {
      if (!cv || quieto()) return;
      const formas = { corazones: "corazon", estrellas: "estrella", huellas: "huella" };
      for (let i = 0; i < (n || 40); i++) {
        piezas.push({
          x: Math.random() * g.w, y: azar(-g.h * 0.6, -10), vx: azar(-0.4, 0.4), vy: azar(1.5, 3.2),
          r: azar(6, 12), rot: azar(-0.4, 0.4), giro: azar(-0.02, 0.02), vida: 1.6, decae: 0.006, gravedad: 0.01,
          color: (tipo === "huellas" ? ["#d4af6a", "#f6ecdc"] : ["#c43a52", "#f0d79a", "#f6ecdc", "#d4af6a"])[i % (tipo === "huellas" ? 2 : 4)],
          tipo: formas[tipo] || "estrella"
        });
      }
      if (!raf) raf = requestAnimationFrame(bucle);
    }
    return { iniciar, lanzar, lluvia };
  })();

  /* ------------------------------------------------------------------ */
  /* Escena del gran final: estrellas + corazón de partículas + fuegos   */
  /* ------------------------------------------------------------------ */
  function EscenaFinal(cv) {
    let g, estrellas = [], particulas = [], chispas = [], cohetes = [], raf = 0, t0 = 0, modo = "cielo", proximoCohete = 0;

    function medir() { g = ajustar(cv); }
    function iniciar() {
      medir();
      estrellas = Array.from({ length: Math.min(260, Math.round(g.w * g.h / 4200)) }, () => ({ x: Math.random() * g.w, y: Math.random() * g.h, r: azar(0.3, 1.4), f: azar(0, 6.28) }));
      particulas = []; chispas = []; cohetes = []; modo = "cielo"; t0 = performance.now();
      cancelAnimationFrame(raf);
      if (quieto()) { formarCorazon(true); dibujar(performance.now()); return; }
      raf = requestAnimationFrame(bucle);
    }

    function puntosCorazon(n) {
      const pts = [], escala = Math.min(g.w, g.h) / 38, cx = g.w / 2, cy = g.h * 0.42;
      for (let i = 0; i < n; i++) {
        const t = Math.random() * Math.PI * 2, borde = i < n * 0.6, k = borde ? 1 : Math.sqrt(Math.random()) * 0.95;
        const x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        pts.push({ x: cx + x * escala * k, y: cy - y * escala * k });
      }
      return pts;
    }

    function formarCorazon(inmediato) {
      const destinos = puntosCorazon(Math.min(520, Math.round(g.w * g.h / 1400)));
      particulas = destinos.map(d => ({
        x: inmediato ? d.x : Math.random() * g.w, y: inmediato ? d.y : g.h + azar(0, 200),
        tx: d.x, ty: d.y, r: azar(0.8, 2.2), f: azar(0, 6.28), c: Math.random() < 0.2 ? "#c43a52" : ORO[Math.floor(Math.random() * 3)],
        retraso: azar(0, 1400)
      }));
      modo = "corazon";
    }

    function cohete() {
      cohetes.push({ x: azar(g.w * 0.15, g.w * 0.85), y: g.h + 10, vy: -azar(7, 10), meta: azar(g.h * 0.12, g.h * 0.42), c: MEZCLA[Math.floor(Math.random() * MEZCLA.length)] });
    }
    function explotar(k) {
      const n = 70, colores = [k.c, "#fff3d6", "#f0d79a"];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.283, v = azar(1.5, 4.2);
        chispas.push({ x: k.x, y: k.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 1, c: colores[i % 3], r: azar(1, 2.2) });
      }
      if (window.Sonido) window.Sonido.efecto("fuego");
    }

    function dibujar(t) {
      const c = g.c, seg = (t - t0) / 1000;
      c.fillStyle = "rgba(6,3,5,0.38)";
      c.fillRect(0, 0, g.w, g.h);
      for (const s of estrellas) {
        c.globalAlpha = 0.3 + 0.6 * Math.abs(Math.sin(seg * 0.8 + s.f));
        c.fillStyle = "#fff6e4"; c.beginPath(); c.arc(s.x, s.y, s.r, 0, 6.283); c.fill();
      }
      if (modo !== "cielo") {
        for (const p of particulas) {
          const listo = t - t0 - p.retraso;
          if (listo > 0 && !quieto()) { p.x += (p.tx - p.x) * 0.045; p.y += (p.ty - p.y) * 0.045; }
          c.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(seg * 2 + p.f));
          c.fillStyle = p.c; c.shadowColor = p.c; c.shadowBlur = 8;
          c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill();
        }
        c.shadowBlur = 0;
      }
      if (modo === "fuegos" && !quieto()) {
        if (t > proximoCohete) { cohete(); proximoCohete = t + azar(700, 1500); }
        cohetes = cohetes.filter(k => {
          k.y += k.vy; k.vy *= 0.99;
          c.globalAlpha = 1; c.fillStyle = k.c; c.beginPath(); c.arc(k.x, k.y, 2, 0, 6.283); c.fill();
          if (k.y <= k.meta) { explotar(k); return false; }
          return true;
        });
        chispas = chispas.filter(p => p.vida > 0);
        for (const p of chispas) {
          p.vx *= 0.97; p.vy = p.vy * 0.97 + 0.045; p.x += p.vx; p.y += p.vy; p.vida -= 0.011;
          c.globalAlpha = Math.max(0, p.vida); c.fillStyle = p.c; c.shadowColor = p.c; c.shadowBlur = 6;
          c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill();
        }
        c.shadowBlur = 0;
      }
      c.globalAlpha = 1;
    }
    function bucle(t) { dibujar(t); raf = requestAnimationFrame(bucle); }

    addEventListener("resize", () => { if (raf || quieto()) { const m = modo; medir(); if (m !== "cielo") formarCorazon(true); modo = m; } });

    return {
      iniciar,
      corazon() { formarCorazon(false); t0 = performance.now(); if (quieto()) { formarCorazon(true); dibujar(performance.now()); } },
      fuegos() { modo = "fuegos"; proximoCohete = 0; },
      detener() { cancelAnimationFrame(raf); raf = 0; }
    };
  }

  window.Efectos = { Cielo, Fx, EscenaFinal, quieto };
})();
