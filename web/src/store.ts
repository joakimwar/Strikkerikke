/**
 * Sentralt lager for appens tilstand, lagret automatisk til localStorage
 * slik at du ikke mister fremgangen når fanen lukkes.
 *
 * Port av @Observable StrikkeStore. Alle mutasjoner går gjennom `actions`,
 * som lager en ny State og varsler abonnenter.
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
  type State,
} from './model'
import { deletePhoto } from './db'

const STORAGE_KEY = 'ustastrikk.state.v1'

/**
 * Leser lagret tilstand. Tolerant for manglende felt, slik at eksisterende
 * data ikke går tapt når modellen utvides.
 */
function load(): State {
  const base = emptyState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const parsed = JSON.parse(raw) as Partial<State>
    return {
      projects: Array.isArray(parsed.projects)
        ? parsed.projects.map((p) => ({ ...newProject(''), ...p }))
        : base.projects,
      rowCount: typeof parsed.rowCount === 'number' ? parsed.rowCount : base.rowCount,
      rowStopwatch: parsed.rowStopwatch ?? newStopwatch(),
      currentRowStopwatch: parsed.currentRowStopwatch ?? newStopwatch(),
    }
  } catch {
    return base
  }
}

let state: State = load()
const listeners = new Set<() => void>()

function commit(next: State) {
  state = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Full disk / privat modus: vi mister lagring, men appen kjører videre.
  }
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

export const actions = {
  // MARK: - Prosjekter

  addProject(name: string): Project {
    const project = newProject(name.trim())
    commit({ ...state, projects: [...state.projects, project] })
    return project
  },

  deleteProject(id: string) {
    const project = state.projects.find((p) => p.id === id)
    if (project?.photoId) void deletePhoto(project.photoId)
    commit({ ...state, projects: state.projects.filter((p) => p.id !== id) })
  },

  setName(id: string, name: string) {
    mapProject(id, (p) => ({ ...p, name }))
  },

  setNotes(id: string, notes: string) {
    mapProject(id, (p) => ({ ...p, notes }))
  },

  setPhoto(id: string, photoId: string | null) {
    const previous = state.projects.find((p) => p.id === id)?.photoId
    if (previous && previous !== photoId) void deletePhoto(previous)
    mapProject(id, (p) => ({ ...p, photoId }))
  },

  // MARK: - Omganger

  addRound(id: string) {
    mapProject(id, (p) => ({ ...p, rounds: [...p.rounds, newRound()] }))
  },

  setRoundPattern(id: string, roundId: string, pattern: string) {
    mapProject(id, (p) => ({
      ...p,
      rounds: p.rounds.map((r) => (r.id === roundId ? { ...r, pattern } : r)),
    }))
  },

  deleteRound(id: string, roundId: string) {
    mapProject(id, (p) =>
      clampCurrentIndex({ ...p, rounds: p.rounds.filter((r) => r.id !== roundId) }),
    )
  },

  /** Flytter en omgang opp (-1) eller ned (+1). Erstatter SwiftUI-ens .onMove. */
  moveRound(id: string, index: number, delta: number) {
    mapProject(id, (p) => {
      const target = index + delta
      if (target < 0 || target >= p.rounds.length) return p
      const rounds = [...p.rounds]
      const [moved] = rounds.splice(index, 1)
      rounds.splice(target, 0, moved)
      return { ...p, rounds }
    })
  },

  // MARK: - Strikking

  /**
   * Fullfører gjeldende omgang. Returnerer true hvis hele prosjektet nå er
   * ferdig, slik at visningen kan feire.
   */
  completeRound(id: string): boolean {
    const project = state.projects.find((p) => p.id === id)
    if (!project) return false
    const next = { ...project, currentRoundIndex: project.currentRoundIndex + 1 }
    const finished = isFinished(next)
    // Stopp timeren når hele prosjektet er fullført.
    mapProject(id, () => (finished ? { ...next, stopwatch: pause(next.stopwatch, Date.now()) } : next))
    return finished
  },

  undoRound(id: string) {
    mapProject(id, (p) =>
      p.currentRoundIndex > 0 ? { ...p, currentRoundIndex: p.currentRoundIndex - 1 } : p,
    )
  },

  restartProject(id: string) {
    mapProject(id, (p) => ({ ...p, currentRoundIndex: 0 }))
  },

  startProjectTimer(id: string) {
    mapProject(id, (p) => ({ ...p, stopwatch: start(p.stopwatch, Date.now()) }))
  },

  pauseProjectTimer(id: string) {
    mapProject(id, (p) => ({ ...p, stopwatch: pause(p.stopwatch, Date.now()) }))
  },

  resetProjectTimer(id: string) {
    mapProject(id, (p) => ({ ...p, stopwatch: newStopwatch() }))
  },

  // MARK: - Rad-teller

  rowStart() {
    const now = Date.now()
    commit({
      ...state,
      rowStopwatch: start(state.rowStopwatch, now),
      currentRowStopwatch: start(state.currentRowStopwatch, now),
    })
  },

  rowPause() {
    const now = Date.now()
    commit({
      ...state,
      rowStopwatch: pause(state.rowStopwatch, now),
      currentRowStopwatch: pause(state.currentRowStopwatch, now),
    })
  },

  rowIncrement() {
    commit({
      ...state,
      rowCount: state.rowCount + 1,
      currentRowStopwatch: restart(Date.now()),
    })
  },

  rowDecrement() {
    if (state.rowCount === 0) return
    commit({ ...state, rowCount: state.rowCount - 1 })
  },

  rowResetAll() {
    commit({
      ...state,
      rowCount: 0,
      rowStopwatch: newStopwatch(),
      currentRowStopwatch: newStopwatch(),
    })
  },
}
