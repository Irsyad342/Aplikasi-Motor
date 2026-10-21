/* RideCheck Service Worker — PWA agar bisa dipasang seperti aplikasi di HP */
const VERSION = 'ridecheck-v3'
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/images/app-icon-192.png',
  '/images/app-icon-512.png',
  '/images/app-icon-maskable-512.png',
  '/logo.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // API & Overpass: selalu network (data harus segar), tanpa cache fallback
  if (url.pathname.startsWith('/api/')) return

  // Statis Next.js & gambar: cache-first
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/_next/static/') ||
      url.pathname.startsWith('/images/') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.woff2') ||
      url.pathname.endsWith('.webmanifest'))
  ) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone()
            caches.open(VERSION).then((cache) => cache.put(req, copy)).catch(() => {})
            return res
          })
      )
    )
    return
  }

  // Halaman (navigasi): network-first, fallback cache saat offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(VERSION).then((cache) => cache.put(req, copy)).catch(() => {})
          return res
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('/')))
    )
  }
})
