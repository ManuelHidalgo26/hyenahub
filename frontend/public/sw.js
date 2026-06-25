/*
 * HyenaHub service worker — Fase 6a (solo lectura).
 *
 * Cachea el shell de la app y las respuestas GET de lectura del cliente para
 * que la app abra sin conexión y muestre la última rutina / entrenador vistos.
 * NO intercepta escrituras (POST/PATCH/DELETE): esas siguen yendo a la red.
 */
// Subir esta versión invalida las cachés viejas en el `activate` de abajo. Es
// imprescindible bumpearla al desplegar fixes de auth/navegación: si no, los
// clientes que ya instalaron la PWA siguen sirviendo el código viejo cacheado
// (cache-first de /_next/) y no reciben la corrección.
const CACHE_VERSION = "hyenahub-v2";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGES_CACHE = `${CACHE_VERSION}-pages`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Rutas GET de lectura del cliente que cacheamos para offline.
const CACHEABLE_API = ["/api/routines/my", "/api/profile/my-trainer"];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Borrar caches de versiones anteriores.
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Nunca tocar escrituras ni métodos que no sean GET.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // solo mismo origen

  // 1) GET de API de lectura → network-first con fallback a caché.
  if (CACHEABLE_API.some((p) => url.pathname === p || url.pathname.startsWith(`${p}?`))) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // 2) Navegaciones (HTML) → network-first con fallback a la última página cacheada.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, PAGES_CACHE));
    return;
  }

  // 3) Assets estáticos (chunks de Next, íconos, fuentes) → cache-first.
  if (
    url.pathname.startsWith("/_next/") ||
    /\.(?:js|css|png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.status === 200) cache.put(request, response.clone());
  return response;
}
