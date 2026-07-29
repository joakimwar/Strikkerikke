/**
 * Rot-visningen med en fanelinje nederst, slik at både prosjekter og
 * rad-telleren alltid er ett trykk unna. Port av ContentView.
 *
 * NavigationStack er erstattet med hash-ruting, så nettleserens tilbake-knapp
 * og iOS-sveipen fungerer som forventet:
 *   #/prosjekter            liste
 *   #/prosjekter/:id        detaljer
 *   #/prosjekter/:id/strikk strikkemodus
 *   #/rad                   rad-teller
 */

import { navigate, useHashRoute } from './hooks'
import { useProject } from './store'
import { Hash, Stack } from './icons'
import { EmptyState, Navbar } from './components/chrome'
import { ProjectList } from './components/ProjectList'
import { ProjectDetail } from './components/ProjectDetail'
import { KnitMode } from './components/KnitMode'
import { RowCounter } from './components/RowCounter'

export function App() {
  const segments = useHashRoute()
  const tab = segments[0] === 'rad' ? 'rad' : 'prosjekter'
  const projectId = tab === 'prosjekter' ? segments[1] : undefined
  const project = useProject(projectId)

  return (
    <div className="app">
      {renderScreen()}

      <nav className="tabbar">
        <button
          type="button"
          className="tabbar__item"
          aria-current={tab === 'prosjekter' ? 'page' : undefined}
          onClick={() => navigate('prosjekter')}
        >
          <Stack size={24} />
          Prosjekter
        </button>
        <button
          type="button"
          className="tabbar__item"
          aria-current={tab === 'rad' ? 'page' : undefined}
          onClick={() => navigate('rad')}
        >
          <Hash size={24} />
          Rad-teller
        </button>
      </nav>
    </div>
  )

  function renderScreen() {
    if (tab === 'rad') return <RowCounter />

    if (projectId) {
      if (!project) {
        // Lenke til et prosjekt som er slettet (eller en ugyldig adresse).
        return (
          <>
            <Navbar title="Prosjekt" back />
            <main className="content">
              <EmptyState
                icon={<Stack size={52} />}
                title="Finner ikke prosjektet"
                body="Det ble kanskje slettet. Gå tilbake til listen for å velge et annet."
              />
              <button
                type="button"
                className="button button--prominent"
                onClick={() => navigate('prosjekter')}
              >
                Til prosjekter
              </button>
            </main>
          </>
        )
      }
      return segments[2] === 'strikk' ? (
        <KnitMode key={project.id} project={project} />
      ) : (
        <ProjectDetail project={project} />
      )
    }

    return <ProjectList />
  }
}
