/**
 * Rad-teller med stoppeklokke og tidsoversikt.
 * Timeren styres av knappene: Start → (+1 / Pause) → Fortsett.
 * Port av RadTellerView.
 */

import { actions, useStore } from '../store'
import { useNow, useWakeLock } from '../hooks'
import { elapsed, formatDuration, isRunning } from '../model'
import { ChartBar, Clock, Ellipsis, Minus, Pause, Play, Rotate, Timer } from '../icons'
import { Menu, MenuItem, Navbar } from './chrome'
import type { ReactNode } from 'react'

function Stat({
  label,
  time,
  color,
  icon,
}: {
  label: string
  time: number
  color: string
  icon: ReactNode
}) {
  return (
    <div className="stat">
      <span style={{ color }}>{icon}</span>
      <span className="stat__label">{label}</span>
      <span className="stat__value">{formatDuration(time)}</span>
    </div>
  )
}

export function RowCounter() {
  const state = useStore()
  const running = isRunning(state.rowStopwatch)

  // Ingenting er startet ennå (frisk skjerm).
  const notStarted = !running && state.rowStopwatch.accumulated === 0

  // Tidsoversikten oppdateres hvert sekund mens telleren går.
  const now = useNow(running)
  const total = elapsed(state.rowStopwatch, now)
  const current = elapsed(state.currentRowStopwatch, now)
  const average = state.rowCount > 0 ? total / state.rowCount : 0

  // Hold skjermen våken mens du teller rader.
  useWakeLock(running)

  return (
    <>
      <Navbar
        title="Rad-teller"
        large
        trailing={
          <Menu label={<Ellipsis size={24} />}>
            <MenuItem
              icon={<Minus size={18} />}
              disabled={state.rowCount === 0}
              onClick={actions.rowDecrement}
            >
              Trekk fra én rad
            </MenuItem>
            <MenuItem icon={<Rotate size={18} />} destructive onClick={actions.rowResetAll}>
              Nullstill alt
            </MenuItem>
          </Menu>
        }
      />

      <main className="content counter">
        <div className="knit__spacer" />

        <p className="counter__label" style={{ margin: 0 }}>
          Rad
        </p>
        <p className="counter__value" style={{ margin: 0 }}>
          {state.rowCount}
        </p>

        <div className="knit__spacer" />

        <div className="stats">
          <Stat label="Denne raden" time={current} color="var(--accent)" icon={<Timer />} />
          <Stat label="Snitt/rad" time={average} color="var(--tertiary)" icon={<ChartBar />} />
          <Stat label="Totalt" time={total} color="var(--secondary)" icon={<Clock />} />
        </div>

        <div className="counter__controls">
          {running ? (
            <>
              <button
                type="button"
                className="button button--prominent button--huge"
                onClick={actions.rowIncrement}
              >
                +1
              </button>
              <button
                type="button"
                className="button button--bordered"
                onClick={actions.rowPause}
              >
                <Pause size={18} />
                Pause
              </button>
            </>
          ) : (
            <button
              type="button"
              className="button button--prominent button--tall"
              onClick={actions.rowStart}
            >
              <Play size={22} />
              {notStarted ? 'Start' : 'Fortsett'}
            </button>
          )}
        </div>
      </main>
    </>
  )
}
