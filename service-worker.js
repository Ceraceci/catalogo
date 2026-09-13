/* CERACECI V321 — PWA instalable, sin cachear catálogo ni datos. */
const CERACECI_SW_VERSION = "321";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request));
});
