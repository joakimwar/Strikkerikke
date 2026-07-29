import { useEffect, useRef, useState } from 'react'
import { getPhoto } from './db'

/**
 * Returnerer Date.now() og oppdaterer hvert sekund så lenge `active` er true.
 * Erstatter SwiftUI-ens TimelineView(.periodic(from: .now, by: 1)).
 *
 * Når `active` er false står klokka stille – da er tiden lagret og trenger
 * ingen omtegning.
 */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    // Oppdater umiddelbart, slik at visningen ikke viser et gammelt tall
    // etter at fanen har vært i bakgrunnen.
    setNow(Date.now())
    if (!active) return

    const id = window.setInterval(() => setNow(Date.now()), 1000)

    // iOS fryser timere i bakgrunnsfaner; hent inn riktig tid ved retur.
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(Date.now())
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [active])

  return now
}

/** Screen Wake Lock API – ikke i alle TS-versjoners DOM-typer, så vi beskriver den selv. */
type WakeLockSentinelLike = { release: () => Promise<void> }
type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> }
}

/**
 * Holder skjermen våken mens `active` er true – nyttig når du strikker og ikke
 * rører telefonen mellom omgangene. Krever HTTPS, og gjør ingenting på
 * nettlesere uten støtte.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    const wakeLock = (navigator as WakeLockNavigator).wakeLock
    if (!active || !wakeLock) return

    let sentinel: WakeLockSentinelLike | null = null
    let cancelled = false

    const request = async () => {
      try {
        const lock = await wakeLock.request('screen')
        if (cancelled) {
          void lock.release()
          return
        }
        sentinel = lock
      } catch {
        // Nektet eller ikke tilgjengelig – vi lever fint uten.
      }
    }

    void request()

    // Låsen slippes automatisk når fanen skjules; ta den igjen ved retur.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !sentinel) void request()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void sentinel?.release()
      sentinel = null
    }
  }, [active])
}

/** Henter et prosjektbilde fra IndexedDB som en object-URL, og rydder opp etter seg. */
export function usePhotoUrl(photoId: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!photoId) {
      setUrl(null)
      return
    }

    let objectUrl: string | null = null
    let cancelled = false

    void getPhoto(photoId).then((blob) => {
      if (cancelled || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setUrl(null)
    }
  }, [photoId])

  return url
}

/**
 * Minimal hash-basert ruting. Hash holder adressen fri for stier, slik at
 * appen kan ligge i en vilkårlig undermappe – og nettleserens tilbake-knapp
 * (og iOS-sveipen) fungerer som NavigationStack gjorde.
 */
export function useHashRoute(): string[] {
  const [hash, setHash] = useState(() => window.location.hash)

  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return hash.replace(/^#\/?/, '').split('/').filter(Boolean)
}

export function navigate(path: string) {
  window.location.hash = `#/${path.replace(/^\/+/, '')}`
}

export function goBack() {
  window.history.back()
}

/** Kjører en effekt bare når komponenten monteres og demonteres, med fersk callback. */
export function useMountEffect(onMount: () => void, onUnmount: () => void) {
  const unmountRef = useRef(onUnmount)
  unmountRef.current = onUnmount

  useEffect(() => {
    onMount()
    return () => unmountRef.current()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
