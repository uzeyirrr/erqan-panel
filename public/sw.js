// Erqan service worker.
// Yalnızca derlenmiş statik dosyaları ve ikonları önbelleğe alır; sayfalar her zaman
// ağdan gelir (bayat içerik gösterilmez), ağ yoksa offline sayfası gösterilir.
// API (PocketBase) ayrı bir alan adında olduğu için hiç dokunulmaz.

const VERSION = "erqan-v1"
const OFFLINE_URL = "/offline.html"

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"])).then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET") return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Sayfa gezintisi: ağ, olmazsa offline sayfası.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)))
    return
  }

  // Sürüm hash'li statik dosyalar ve ikonlar: önce önbellek.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(VERSION).then((cache) => cache.put(req, copy))
            }
            return res
          }),
      ),
    )
  }
})
