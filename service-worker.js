/* CERACECI V318 — Service Worker de instalación PWA.
   No guarda el catálogo ni las respuestas de red en caché.
   Todas las solicitudes siguen yendo a la red para conservar datos actualizados. */

const CERACECI_SW_VERSION = "318";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request));
});
