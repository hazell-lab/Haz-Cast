// hazcast service worker
// keeps the app itself available offline. weather data is not cached here,
// the app saves its own copy of the last forecast per place and labels it as saved data

const version = "hazcast-v1";

const appFiles = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/weather-core.js",
  "./js/script.js",
  "./manifest.webmanifest",
  "./assets/icons/favicon.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

// fonts can be reused as they are, they never change at the same address
const fontHosts = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(version)
      .then((cache) => cache.addAll(appFiles))
      .then(() => self.skipWaiting())
  );
});

// remove caches from older versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== version).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // app files: try the network first so updates show up, fall back to the copy
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (fontHosts.includes(url.hostname)) {
    event.respondWith(cacheFirst(request));
  }

  // everything else (weather, alerts, radar, map tiles) goes straight to the network
});

async function networkFirst(request) {
  const cache = await caches.open(version);

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    // shared links have a query, so match the page without it
    const saved = await cache.match(request, { ignoreSearch: request.mode === "navigate" });
    return saved || (request.mode === "navigate" ? cache.match("./") : Response.error());
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(version);
  const saved = await cache.match(request);
  if (saved) return saved;

  const response = await fetch(request);
  if (response.ok || response.type === "opaque") cache.put(request, response.clone());
  return response;
}
