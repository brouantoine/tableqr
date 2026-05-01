// Service Worker — Web Push pour admin TableQR

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  let data = {}
  try { data = event.data.json() } catch { data = { title: 'Nouvelle commande', body: event.data.text() } }

  const title = data.title || 'Nouvelle commande'
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/badge.png',
    tag: data.tag || 'tableqr-order',
    renotify: true,
    requireInteraction: data.requireInteraction ?? true,
    vibrate: [200, 100, 200, 100, 200],
    data: { url: data.url || '/admin/dashboard', ...data.data },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/admin/dashboard'
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of clientsList) {
      try {
        const u = new URL(client.url)
        if (u.origin === self.location.origin) {
          await client.focus()
          if ('navigate' in client) await client.navigate(url)
          return
        }
      } catch {}
    }
    await self.clients.openWindow(url)
  })())
})
