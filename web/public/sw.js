/*
 * Service worker for offline-bruk.
 *
 * Strategien er enkel med vilje: appen har ingen server å snakke med, så alt
 * som lastes ned kan trygt caches.
 *
 * Ved installasjon henter vi app-skallet og leser ut hvilke hashede JS/CSS-filer
 * det peker på, og cacher dem. Det er nødvendig fordi service workeren ikke
 * styrer siden ennå under det aller første besøket – uten dette ville de
 * filene aldri havnet i cachen, og appen ville vist en blank side offline.
 * Å lese filnavnene ut av HTML-en betyr også at vi slipper å holde en liste
 * med hasher i sync med byggeprosessen.
 */

const CACHE = 'ustastrikk-v2'
const SHELL = './'
const EXTRAS = ['./manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png']

async function precache() {
  const cache = await caches.open(CACHE)

  await Promise.all(
    EXTRAS.map((url) => cache.add(url).catch(() => undefined)),
  )

  // Hent app-skallet uten å gå via cachen, og lagre det.
  const response = await fetch(SHELL, { cache: 'reload' })
  if (!response.ok) return
  await cache.put(SHELL, response.clone())

  // Finn de hashede byggefilene skallet refererer til, og cache dem.
  const html = await response.text()
  const urls = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((match) => match[1])

  await Promise.all(
    urls.map((url) => cache.add(new URL(url, self.location.href)).catch(() => undefined)),
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    precache()
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navigasjon: prøv nett først (så du får ny versjon når du er på nett),
  // fall tilbake til det cachede app-skallet offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          void caches.open(CACHE).then((cache) => cache.put(SHELL, response.clone()))
          return response
        })
        .catch(() =>
          caches
            .match(SHELL)
            .then((hit) => hit ?? new Response('Offline', { status: 503, statusText: 'Offline' })),
        ),
    )
    return
  }

  // Alt annet: cache-first, og legg nye svar i cachen underveis.
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            void caches.open(CACHE).then((cache) => cache.put(request, response.clone()))
          }
          return response
        }),
    ),
  )
})
