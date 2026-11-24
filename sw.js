/* Service worker: permite instalar el calendario y abrirlo sin conexión.

   - Páginas, estilos y código: "primero la red". Siempre se ve la última
     versión publicada; si no hay internet, se usa la copia guardada.
   - La canción NO pasa por aquí: Safari la pide por partes (peticiones
     "Range") y un service worker en medio puede dejarla muda en iPhone.
     El navegador la maneja directamente con su propia caché.

   Al publicar cambios, sube VERSION (y el ?v= de index.html) para que
   se borre la copia anterior. */
const VERSION = "adri-v4";
const BASICOS = [
  "./", "index.html", "css/estilos.css?v=4",
  "js/config.js?v=4", "js/audio.js?v=4", "js/efectos.js?v=4", "js/sorpresas.js?v=4", "js/app.js?v=4",
  "manifest.webmanifest", "iconos/icono-192.png", "iconos/icono-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(BASICOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (req.headers.has("range") || req.destination === "audio" || req.destination === "video" || /\.(mp3|m4a|aac|ogg|wav|mp4)$/i.test(url.pathname)) return;
  e.respondWith(
    fetch(req, { cache: "no-cache" }).then(res => {
      if (res.ok && res.type === "basic") { const copia = res.clone(); caches.open(VERSION).then(c => c.put(req, copia)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || (req.mode === "navigate" ? caches.match("index.html") : undefined)))
  );
});
