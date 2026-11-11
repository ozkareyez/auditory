// Service worker de la app: la deja funcionar sin señal en el patio.
// - Las páginas piden red primero (para recibir actualizaciones) y caen a
//   la copia local si no hay conexión.
// - Los archivos con huella (JS, CSS, iconos) no cambian: se sirven de la
//   copia local desde la primera visita.
const VERSION = 'auditoria-v1'

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(VERSION).then((cache) => cache.add('./')))
  self.skipWaiting()
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) =>
        Promise.all(nombres.filter((nombre) => nombre !== VERSION).map((nombre) => caches.delete(nombre))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request
  if (pedido.method !== 'GET' || new URL(pedido.url).origin !== self.location.origin) return

  // Navegación: red primero, copia local como respaldo sin señal.
  if (pedido.mode === 'navigate') {
    evento.respondWith(
      fetch(pedido)
        .then((respuesta) => {
          const copia = respuesta.clone()
          caches.open(VERSION).then((cache) => cache.put(pedido, copia))
          return respuesta
        })
        .catch(() => caches.match(pedido).then((enCache) => enCache ?? caches.match('./'))),
    )
    return
  }

  // Demás archivos del mismo origen: copia local primero.
  evento.respondWith(
    caches.match(pedido).then((enCache) => {
      if (enCache) return enCache
      return fetch(pedido).then((respuesta) => {
        if (respuesta.ok) {
          const copia = respuesta.clone()
          caches.open(VERSION).then((cache) => cache.put(pedido, copia))
        }
        return respuesta
      })
    }),
  )
})
