/**
 * «Kjøre»-modus: viser omgangnummer, mønster, strikketid og en knapp for å
 * fullføre omgangen. Port av OmgangKjorView.
 */

import { useState } from 'react'
import { actions } from '../store'
import { useMountEffect, useWakeLock } from '../hooks'
import { isFinished, type Project } from '../model'
import { playFanfare } from '../fanfare'
import { CheckCircle, ListNumber, Timer, Undo } from '../icons'
import { EmptyState, Navbar } from './chrome'
import { ElapsedTime } from './ElapsedTime'
import { Confetti } from './Confetti'

export function KnitMode({ project }: { project: Project }) {
  const finished = isFinished(project)
  const [celebrating, setCelebrating] = useState(false)

  // Hold skjermen våken mens du strikker.
  useWakeLock(!finished)

  useMountEffect(
    () => {
      // Start strikketimeren automatisk (med mindre prosjektet allerede er ferdig).
      if (!isFinished(project)) actions.startProjectTimer(project.id)
    },
    () => {
      // Pauser når du går tilbake, slik at tiden samles opp mellom øktene.
      actions.pauseProjectTimer(project.id)
    },
  )

  const completeRound = () => {
    if (actions.completeRound(project.id)) {
      setCelebrating(true)
      playFanfare()
    }
  }

  return (
    <>
      <Navbar title="Strikking" back />

      <main className="content knit">
        {project.rounds.length === 0 ? (
          <EmptyState
            icon={<ListNumber size={52} />}
            title="Ingen omganger"
            body="Legg til omganger først."
          />
        ) : finished ? (
          <div className="knit__done">
            <CheckCircle size={80} className="knit__done-icon" />
            <h2 className="knit__done-title">Ferdig!</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              Du har fullført alle {project.rounds.length} omgangene.
            </p>
            <button
              type="button"
              className="button button--prominent"
              onClick={() => {
                setCelebrating(false)
                actions.restartProject(project.id)
                actions.startProjectTimer(project.id)
              }}
            >
              Start på nytt
            </button>
          </div>
        ) : (
          <>
            <div className="knit__timer">
              <Timer />
              <ElapsedTime stopwatch={project.stopwatch} />
            </div>

            <div className="knit__spacer" />

            <p className="knit__progress">
              Omgang {project.currentRoundIndex + 1} av {project.rounds.length}
            </p>

            <p className="knit__pattern">
              {project.rounds[project.currentRoundIndex].pattern.trim() === ''
                ? '—'
                : project.rounds[project.currentRoundIndex].pattern}
            </p>

            <div className="knit__spacer" />

            <div className="knit__actions">
              <button
                type="button"
                className="button button--prominent button--tall"
                onClick={completeRound}
              >
                Fullfør omgang
              </button>

              {project.currentRoundIndex > 0 && (
                <button
                  type="button"
                  className="button button--plain"
                  onClick={() => actions.undoRound(project.id)}
                >
                  <Undo size={16} />
                  Angre forrige omgang
                </button>
              )}
            </div>
          </>
        )}
      </main>

      {finished && celebrating && <Confetti />}
    </>
  )
}
