/**
 * Datamodell for Ustastrikk.
 *
 * Port av Stopwatch/Round/Project fra StrikkeStore.swift. Eneste forskjell:
 * tid måles i millisekunder (Date.now()) i stedet for sekunder, og bilder
 * ligger i Supabase Storage med en sti her i stedet for rå Data i modellen.
 */

/** En stoppeklokke som kan pauses og gjenopptas. */
export interface Stopwatch {
  /** Oppsamlet tid fra tidligere økter, i millisekunder. */
  accumulated: number
  /** Epoch-ms for da klokka sist ble startet, eller null når den står stille. */
  startedAt: number | null
}

/** En enkelt omgang med et mønster som beskriver hva du skal strikke. */
export interface Round {
  id: string
  pattern: string
}

/** Et strikkeprosjekt med navn, omganger, notater, bilde, fremdrift og strikketid. */
export interface Project {
  id: string
  name: string
  rounds: Round[]
  /** Hvilken omgang du er på nå (0-basert). Blir lik rounds.length når prosjektet er fullført. */
  currentRoundIndex: number
  notes: string
  /** Sti til bildet i Supabase Storage, eller null. */
  photoPath: string | null
  stopwatch: Stopwatch
}

/** Hvor langt lageret har kommet med å hente dataene fra Supabase. */
export type LoadStatus = 'laster' | 'klar' | 'feil'

/** Hele appens tilstand. */
export interface State {
  projects: Project[]
  /** Verdien i rad-telleren (delt på tvers av prosjekter, som i iOS-appen). */
  rowCount: number
  /** Total strikketid for rad-telleren. */
  rowStopwatch: Stopwatch
  /** Tid brukt på den inneværende raden (nullstilles hver gang du øker rad-tallet). */
  currentRowStopwatch: Stopwatch
  /** Status for hentingen av dataene. */
  status: LoadStatus
  /**
   * Satt når en lagring mot Supabase mislyktes. Da er skjermen foran deg ikke
   * lenger i synk med databasen, og brukeren må hente inn på nytt.
   */
  saveError: string | null
}

export const newStopwatch = (): Stopwatch => ({ accumulated: 0, startedAt: null })

export const isRunning = (sw: Stopwatch): boolean => sw.startedAt !== null

/** Total tid frem til `now`, inkludert pågående kjøring. */
export const elapsed = (sw: Stopwatch, now: number): number =>
  sw.accumulated + (sw.startedAt !== null ? now - sw.startedAt : 0)

/** Starter klokka hvis den står stille (ellers gjør ingenting). */
export const start = (sw: Stopwatch, now: number): Stopwatch =>
  sw.startedAt === null ? { ...sw, startedAt: now } : sw

/** Pauser klokka og legger pågående tid til det oppsamlede (ellers ingenting). */
export const pause = (sw: Stopwatch, now: number): Stopwatch =>
  sw.startedAt === null
    ? sw
    : { accumulated: sw.accumulated + (now - sw.startedAt), startedAt: null }

/** Nullstiller tiden og starter på nytt fra `now`. */
export const restart = (now: number): Stopwatch => ({ accumulated: 0, startedAt: now })

export const reset = (): Stopwatch => newStopwatch()

export const emptyState = (): State => ({
  projects: [],
  rowCount: 0,
  rowStopwatch: newStopwatch(),
  currentRowStopwatch: newStopwatch(),
  status: 'laster',
  saveError: null,
})

export const newProject = (name: string): Project => ({
  id: crypto.randomUUID(),
  name,
  rounds: [],
  currentRoundIndex: 0,
  notes: '',
  photoPath: null,
  stopwatch: newStopwatch(),
})

export const newRound = (): Round => ({ id: crypto.randomUUID(), pattern: '' })

/** True når prosjektet har omganger og alle er fullført. */
export const isFinished = (project: Project): boolean =>
  project.rounds.length > 0 && project.currentRoundIndex >= project.rounds.length

/** Formaterer et tidsintervall (ms) som mm:ss eller t:mm:ss. Speiler formatDuration i Theme.swift. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
}
