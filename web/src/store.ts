/**
 * Sentralt lager for appens tilstand, lagret i Supabase på brukerens konto.
 *
 * Port av @Observable StrikkeStore. Alle mutasjoner går gjennom `actions`,
 * som lager en ny State, varsler abonnenter, og sender endringen videre til
 * databasen.
 *
 * Skrivingene er optimistiske: den lokale tilstanden oppdateres med én gang så
 * knappene svarer umiddelbart, og nettverkskallet går i bakgrunnen. Går kallet
 * galt, settes `saveError` – da er skjermen ikke lenger i synk med databasen,
 * og brukeren får tilbud om å hente inn på nytt. Appen har ingen offline-modus:
 * uten nett kan du ikke lagre.
 */

import { useSyncExternalStore } from 'react'
import {
  emptyState,
  newProject,
  newRound,
  newStopwatch,
  isFinished,
  pause,
  restart,
  start,
  type Project,
  type Round,
  type State,
  type Stopwatch,
} from './model'
import { supabase } from './supabase'
import { deletePhoto, uploadPhoto } from './photos'

/** Databasen lagrer tidspunkt som timestamptz, klienten regner i epoch-ms. */
const toIso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString())
const fromIso = (iso: string | null) => (iso === null ? null : Date.parse(iso))

let state: State = emptyState()
const listeners = new Set<() => void>()

/** Bruker-id-en dataene tilhører, eller null når ingen er innlogget. */
let userId: string | null = null

function commit(next: State) {
  state = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getSnapshot = () => state

/** Leser hele tilstanden og abonnerer på endringer. */
export function useStore(): State {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/** Leser ett prosjekt, eller undefined hvis id-en ikke finnes. */
export function useProject(id: string | undefined): Project | undefined {
  const { projects } = useStore()
  return id ? projects.find((p) => p.id === id) : undefined
}

// MARK: - Skriving mot Supabase

/**
 * Kjører en skriving i bakgrunnen. Feiler den, blir `saveError` stående til
 * dataene er hentet inn på nytt – vi later ikke som om endringen ble lagret.
 */
function write(run: () => PromiseLike<{ error: { message: string } | null }>) {
  void (async () => {
    try {
      const { error } = await run()
      if (error) throw new Error(error.message)
    } catch {
      commit({
        ...state,
        saveError: 'Klarte ikke å lagre. Sjekk nettforbindelsen og hent inn på nytt.',
      })
    }
  })()
}

/**
 * Utsatte skrivinger, slik at tekstfelt ikke sender ett kall per tastetrykk.
 * Nøkkelen gjør at skriving i to felt ikke fortrenger hverandre.
 */
const pending = new Map<string, { timer: number; run: () => void }>()

function debounce(key: string, run: () => void, delay = 600) {
  const existing = pending.get(key)
  if (existing) window.clearTimeout(existing.timer)

  const timer = window.setTimeout(() => {
    pending.delete(key)
    run()
  }, delay)

  pending.set(key, { timer, run })
}

/** Kjører alle utsatte skrivinger med én gang. */
export function flushPending() {
  const waiting = [...pending.values()]
  pending.clear()
  waiting.forEach(({ timer, run }) => {
    window.clearTimeout(timer)
    run()
  })
}

// Fanen kan bli lagt i bakgrunnen eller lukket midt i et notat. iOS gir oss
// ikke alltid 'beforeunload', men 'pagehide' og visibilitychange kommer.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushPending()
})
window.addEventListener('pagehide', flushPending)

// MARK: - Henting

/** Henter alt for den innloggede brukeren og erstatter tilstanden. */
export async function hydrate() {
  const id = userId
  if (!id) return

  commit({ ...emptyState(), status: 'laster' })

  try {
    const [projects, rounds, counter] = await Promise.all([
      supabase.from('projects').select('*').eq('user_id', id).order('created_at'),
      supabase.from('rounds').select('*').eq('user_id', id).order('position'),
      supabase.from('row_counter').select('*').eq('user_id', id).maybeSingle(),
    ])

    if (projects.error) throw new Error(projects.error.message)
    if (rounds.error) throw new Error(rounds.error.message)
    if (counter.error) throw new Error(counter.error.message)

    // Brukeren kan ha rukket å logge ut mens vi ventet på svaret.
    if (userId !== id) return

    // Grupper omgangene på prosjekt. De kom sortert på position fra databasen.
    const byProject = new Map<string, Round[]>()
    for (const row of rounds.data ?? []) {
      const list = byProject.get(row.project_id) ?? []
      list.push({ id: row.id, pattern: row.pattern })
      byProject.set(row.project_id, list)
    }

    commit({
      projects: (projects.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        rounds: byProject.get(row.id) ?? [],
        currentRoundIndex: row.current_round_index,
        notes: row.notes,
        photoPath: row.photo_path,
        stopwatch: {
          accumulated: row.stopwatch_accumulated,
          startedAt: fromIso(row.stopwatch_started_at),
        },
      })),
      rowCount: counter.data?.row_count ?? 0,
      rowStopwatch: counter.data
        ? {
            accumulated: counter.data.total_accumulated,
            startedAt: fromIso(counter.data.total_started_at),
          }
        : newStopwatch(),
      currentRowStopwatch: counter.data
        ? {
            accumulated: counter.data.current_accumulated,
            startedAt: fromIso(counter.data.current_started_at),
          }
        : newStopwatch(),
      status: 'klar',
      saveError: null,
    })
  } catch {
    if (userId !== id) return
    commit({ ...emptyState(), status: 'feil' })
  }
}

// Følger innloggingen. Fyres også ved oppstart, så den lagrede økta plukkes opp.
supabase.auth.onAuthStateChange((_event, session) => {
  const id = session?.user.id ?? null
  // Fornying av token gir samme bruker – da er det ingenting å hente på nytt.
  if (id === userId) return

  userId = id
  if (id) void hydrate()
  else commit(emptyState())
})

// MARK: - Hjelpere

/** Erstatter ett prosjekt via en oppdateringsfunksjon. */
function mapProject(id: string, update: (project: Project) => Project) {
  commit({
    ...state,
    projects: state.projects.map((p) => (p.id === id ? update(p) : p)),
  })
}

/** Sørger for at gjeldende omgang ikke peker utenfor listen etter sletting. */
function clampCurrentIndex(project: Project): Project {
  return project.currentRoundIndex > project.rounds.length
    ? { ...project, currentRoundIndex: project.rounds.length }
    : project
}

const findProject = (id: string) => state.projects.find((p) => p.id === id)

/** Kolonnene som beskriver en stoppeklokke på et prosjekt. */
const stopwatchColumns = (sw: Stopwatch) => ({
  stopwatch_accumulated: sw.accumulated,
  stopwatch_started_at: toIso(sw.startedAt),
})

/**
 * Hvor lenge fremdrift og teller samles opp før de skrives. Kort nok til å
 * være borte før brukeren rekker å tenke på det, langt nok til at en rask
 * serie trykk blir én skriving.
 *
 * Det er også det som holder rekkefølgen riktig: to samtidige kall kan lande i
 * hvilken som helst rekkefølge, mens én utsatt skriving alltid sender den
 * ferskeste tilstanden.
 */
const PROGRESS_DELAY = 400

/** Lagrer stoppeklokka og fremdriften for ett prosjekt. */
function saveProgress(id: string) {
  debounce(
    `project:${id}:progress`,
    () => {
      const project = findProject(id)
      if (!project) return

      write(() =>
        supabase
          .from('projects')
          .update({
            current_round_index: project.currentRoundIndex,
            ...stopwatchColumns(project.stopwatch),
          })
          .eq('id', id),
      )
    },
    PROGRESS_DELAY,
  )
}

/** Skriver hele rad-telleren. Upsert, siden raden lages først ved behov. */
function saveRowCounter() {
  debounce(
    'rowCounter',
    () => {
      const id = userId
      if (!id) return

      write(() =>
        supabase.from('row_counter').upsert({
          user_id: id,
          row_count: state.rowCount,
          total_accumulated: state.rowStopwatch.accumulated,
          total_started_at: toIso(state.rowStopwatch.startedAt),
          current_accumulated: state.currentRowStopwatch.accumulated,
          current_started_at: toIso(state.currentRowStopwatch.startedAt),
        }),
      )
    },
    PROGRESS_DELAY,
  )
}

/**
 * Skriver omgangene til ett prosjekt på nytt med rekkefølgen de har lokalt,
 * slik at position alltid er 0..n-1 uten hull.
 *
 * At den er tett er ikke bare pynt: addRound bruker antall omganger som
 * position for den nye. Hadde vi latt hull stå igjen etter en sletting, ville
 * den nye omgangen fått samme position som en som allerede fantes, og
 * rekkefølgen blitt tilfeldig.
 */
function saveRoundOrder(projectId: string) {
  debounce(
    `project:${projectId}:order`,
    () => {
      const id = userId
      const project = findProject(projectId)
      if (!id || !project || project.rounds.length === 0) return

      write(() =>
        supabase.from('rounds').upsert(
          project.rounds.map((round, index) => ({
            id: round.id,
            project_id: projectId,
            user_id: id,
            pattern: round.pattern,
            position: index,
          })),
        ),
      )
    },
    PROGRESS_DELAY,
  )
}

export const actions = {
  /** Henter dataene på nytt – brukes av «Prøv igjen» etter en feil. */
  reload() {
    void hydrate()
  },

  // MARK: - Prosjekter

  addProject(name: string): Project {
    const id = userId
    const project = newProject(name.trim())
    if (!id) return project

    commit({ ...state, projects: [...state.projects, project] })

    write(() =>
      supabase.from('projects').insert({
        id: project.id,
        user_id: id,
        name: project.name,
        notes: '',
        current_round_index: 0,
        photo_path: null,
        stopwatch_accumulated: 0,
        stopwatch_started_at: null,
      }),
    )

    return project
  },

  deleteProject(id: string) {
    const photoPath = findProject(id)?.photoPath
    // Omgangene forsvinner av seg selv (fremmednøkkel med on delete cascade),
    // men bildet ligger i storage og må ryddes eksplisitt.
    if (photoPath) void deletePhoto(photoPath)

    commit({ ...state, projects: state.projects.filter((p) => p.id !== id) })
    write(() => supabase.from('projects').delete().eq('id', id))
  },

  setName(id: string, name: string) {
    mapProject(id, (p) => ({ ...p, name }))
    debounce(`project:${id}:name`, () => {
      const project = findProject(id)
      if (!project) return
      write(() => supabase.from('projects').update({ name: project.name }).eq('id', id))
    })
  },

  setNotes(id: string, notes: string) {
    mapProject(id, (p) => ({ ...p, notes }))
    debounce(`project:${id}:notes`, () => {
      const project = findProject(id)
      if (!project) return
      write(() => supabase.from('projects').update({ notes: project.notes }).eq('id', id))
    })
  },

  /**
   * Laster opp et nytt bilde, eller fjerner bildet når `blob` er null.
   * Det gamle bildet slettes fra storage så vi ikke samler opp foreldreløse filer.
   */
  async setPhoto(id: string, blob: Blob | null) {
    const uid = userId
    if (!uid) return

    const previous = findProject(id)?.photoPath ?? null

    let photoPath: string | null = null
    if (blob) {
      try {
        photoPath = await uploadPhoto(uid, blob)
      } catch {
        commit({ ...state, saveError: 'Klarte ikke å laste opp bildet. Prøv igjen.' })
        return
      }
    }

    mapProject(id, (p) => ({ ...p, photoPath }))
    write(() => supabase.from('projects').update({ photo_path: photoPath }).eq('id', id))

    if (previous) void deletePhoto(previous)
  },

  // MARK: - Omganger

  addRound(id: string) {
    const uid = userId
    const project = findProject(id)
    if (!uid || !project) return

    const round = newRound()
    const position = project.rounds.length

    mapProject(id, (p) => ({ ...p, rounds: [...p.rounds, round] }))

    write(() =>
      supabase.from('rounds').insert({
        id: round.id,
        project_id: id,
        user_id: uid,
        pattern: '',
        position,
      }),
    )
  },

  setRoundPattern(id: string, roundId: string, pattern: string) {
    mapProject(id, (p) => ({
      ...p,
      rounds: p.rounds.map((r) => (r.id === roundId ? { ...r, pattern } : r)),
    }))

    debounce(`round:${roundId}:pattern`, () => {
      const round = findProject(id)?.rounds.find((r) => r.id === roundId)
      if (!round) return
      write(() => supabase.from('rounds').update({ pattern: round.pattern }).eq('id', roundId))
    })
  },

  deleteRound(id: string, roundId: string) {
    // Et utsatt mønster-skriv på denne omgangen ville truffet en slettet rad.
    pending.delete(`round:${roundId}:pattern`)

    mapProject(id, (p) =>
      clampCurrentIndex({ ...p, rounds: p.rounds.filter((r) => r.id !== roundId) }),
    )

    write(() => supabase.from('rounds').delete().eq('id', roundId))
    // Tett igjen hullet sletting etterlot i position (se saveRoundOrder).
    // De to skrivingene rører ulike rader, så rekkefølgen mellom dem spiller
    // ingen rolle.
    saveRoundOrder(id)
    saveProgress(id)
  },

  /** Flytter en omgang opp (-1) eller ned (+1). Erstatter SwiftUI-ens .onMove. */
  moveRound(id: string, index: number, delta: number) {
    const project = findProject(id)
    const target = index + delta
    if (!project || target < 0 || target >= project.rounds.length) return

    mapProject(id, (p) => {
      const rounds = [...p.rounds]
      const [moved] = rounds.splice(index, 1)
      rounds.splice(target, 0, moved)
      return { ...p, rounds }
    })

    saveRoundOrder(id)
  },

  // MARK: - Strikking

  /**
   * Fullfører gjeldende omgang. Returnerer true hvis hele prosjektet nå er
   * ferdig, slik at visningen kan feire.
   */
  completeRound(id: string): boolean {
    const project = findProject(id)
    if (!project) return false

    const next = { ...project, currentRoundIndex: project.currentRoundIndex + 1 }
    const finished = isFinished(next)

    // Stopp timeren når hele prosjektet er fullført.
    mapProject(id, () =>
      finished ? { ...next, stopwatch: pause(next.stopwatch, Date.now()) } : next,
    )
    saveProgress(id)

    return finished
  },

  undoRound(id: string) {
    mapProject(id, (p) =>
      p.currentRoundIndex > 0 ? { ...p, currentRoundIndex: p.currentRoundIndex - 1 } : p,
    )
    saveProgress(id)
  },

  restartProject(id: string) {
    mapProject(id, (p) => ({ ...p, currentRoundIndex: 0 }))
    saveProgress(id)
  },

  startProjectTimer(id: string) {
    mapProject(id, (p) => ({ ...p, stopwatch: start(p.stopwatch, Date.now()) }))
    saveProgress(id)
  },

  pauseProjectTimer(id: string) {
    mapProject(id, (p) => ({ ...p, stopwatch: pause(p.stopwatch, Date.now()) }))
    saveProgress(id)
  },

  resetProjectTimer(id: string) {
    mapProject(id, (p) => ({ ...p, stopwatch: newStopwatch() }))
    saveProgress(id)
  },

  // MARK: - Rad-teller

  rowStart() {
    const now = Date.now()
    commit({
      ...state,
      rowStopwatch: start(state.rowStopwatch, now),
      currentRowStopwatch: start(state.currentRowStopwatch, now),
    })
    saveRowCounter()
  },

  rowPause() {
    const now = Date.now()
    commit({
      ...state,
      rowStopwatch: pause(state.rowStopwatch, now),
      currentRowStopwatch: pause(state.currentRowStopwatch, now),
    })
    saveRowCounter()
  },

  rowIncrement() {
    commit({
      ...state,
      rowCount: state.rowCount + 1,
      currentRowStopwatch: restart(Date.now()),
    })
    saveRowCounter()
  },

  rowDecrement() {
    if (state.rowCount === 0) return
    commit({ ...state, rowCount: state.rowCount - 1 })
    saveRowCounter()
  },

  rowResetAll() {
    commit({
      ...state,
      rowCount: 0,
      rowStopwatch: newStopwatch(),
      currentRowStopwatch: newStopwatch(),
    })
    saveRowCounter()
  },
}
