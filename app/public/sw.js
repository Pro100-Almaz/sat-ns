// Network-first with cache fallback: always fresh online, still opens offline.
// Bump VERSION when the caching strategy changes; old caches are dropped on activate.
const VERSION = 'sat-v2'
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})
self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)) }
        return res
      })
      // Offline: cached file, or the app shell for page navigations (hash routing lives in '/').
      .catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('/') : Response.error()))),
  )
})
self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const open = list.find(c => c.url.startsWith(self.location.origin))
      return open ? open.focus() : self.clients.openWindow('/#/app')
    }),
  )
})
