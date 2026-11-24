/* Service worker: permite instalar el calendario y abrirlo sin conexión.
   Estrategia "primero la red": siempre se ve la última versión publicada y,
   si no hay internet, se usa la copia guardada. Cambia VERSION al publicar
   cambios grandes para limpiar la copia anterior. */
const VERSION = "adri-v2-1";
const BASICOS = [
  "./", "index.html", "css/estilos.css",
  "js/config.js", "js/audio.js", "js/efectos.js", "js/sorpresas.js", "js/app.js",
  "manifest.webmanifest", "iconos/icono-192.png", "iconos/icono-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(BASICOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  // El audio usa peticiones por rangos: lo dejamos pasar directo a la red.
  if (req.headers.has("range") || /\.(mp3|m4a|aac|ogg|wav|mp4)$/i.test(new URL(req.url).pathname)) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copia = res.clone(); caches.open(VERSION).then(c => c.put(req, copia)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match("index.html")))
  );
});
