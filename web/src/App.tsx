/**
 * Rot-visningen med en fanelinje nederst, slik at både prosjekter og
 * rad-telleren alltid er ett trykk unna. Port av ContentView.
 *
 * NavigationStack er erstattet med hash-ruting, så nettleserens tilbake-knapp
 * og iOS-sveipen fungerer som forventet:
 *   #/prosjekter            liste
 *   #/prosjekter/:id        detaljer
 *   #/prosjekter/:id/strikk strikkemodus
 *   #/garn                  garnlager
 *   #/garn/:id              ett garn
 *   #/rad                   rad-teller
 *
 * Alt innhold ligger på brukerens konto, så visningen er delt i tre: laster
 * økta, ikke innlogget (AuthScreen), eller innlogget med data fra Supabase.
 */

import { navigate, useHashRoute } from './hooks'
import { actions, useProject, useStore, useYarn } from './store'
import { useAuth } from './auth'
import { configError } from './supabase'
import { Hash, Stack, Warning, Yarn as YarnIcon } from './icons'
import { EmptyState, Navbar } from './components/chrome'
import { AuthScreen } from './components/Auth'
import { ProjectList } from './components/ProjectList'
import { ProjectDetail } from './components/ProjectDetail'
import { KnitMode } from './components/KnitMode'
import { RowCounter } from './components/RowCounter'
import { YarnList } from './components/YarnList'
import { YarnDetail } from './components/YarnDetail'
import { Diagnostics } from './components/Diagnostics'

export function App() {
  const { session, status: authStatus } = useAuth()
  const { status, saveError } = useStore()
  const segments = useHashRoute()
  const tab =
    segments[0] === 'rad' ? 'rad' : segments[0] === 'garn' ? 'garn' : 'prosjekter'
  const projectId = tab === 'prosjekter' ? segments[1] : undefined
  const project = useProject(projectId)
  const yarnId = tab === 'garn' ? segments[1] : undefined
  const yarn = useYarn(yarnId)

  // Feil oppsett av miljøvariablene ville ellers gitt en blank side.
  if (configError) {
    return (
      <div className="app">
        <main className="content">
          <EmptyState icon={<Warning size={52} />} title="Appen mangler oppsett" body={configError} />
        </main>
      </div>
    )
  }

  // Vent til vi vet om det finnes en lagret økt, så innloggingsskjermen ikke
  // blinker forbi for en som allerede er innlogget.
  if (authStatus === 'laster') return <div className="app" />

  if (!session) return <AuthScreen />

  if (status === 'laster') {
    return (
      <div className="app">
        <main className="content">
          <EmptyState
            icon={<Stack size={52} />}
            title="Henter prosjektene dine …"
            body="Det tar bare et øyeblikk."
          />
        </main>
      </div>
    )
  }

  if (status === 'feil') {
    return (
      <div className="app">
        <main className="content">
          <EmptyState
            icon={<Warning size={52} />}
            title="Fikk ikke tak i dataene"
            body="Appen trenger nett for å hente prosjektene dine. Sjekk forbindelsen og prøv igjen."
          />
          <button type="button" className="button button--prominent" onClick={actions.reload}>
            Prøv igjen
          </button>
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Lagringen har feilet: det du ser er ikke lenger det som står i databasen. */}
      {saveError && (
        <div className="banner" role="alert">
          <Warning size={18} />
          <span className="banner__text">{saveError}</span>
          <button type="button" className="banner__action" onClick={actions.reload}>
            Hent inn
          </button>
        </div>
      )}

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
          aria-current={tab === 'garn' ? 'page' : undefined}
          onClick={() => navigate('garn')}
        >
          <YarnIcon size={24} />
          Garnlager
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
    // Midlertidig, ikke lenket fra noe sted – se Diagnostics.tsx.
    if (segments[0] === 'diag') return <Diagnostics />

    if (tab === 'rad') return <RowCounter />

    if (tab === 'garn') {
      if (yarnId) {
        if (!yarn) {
          // Lenke til et garn som er slettet (eller en ugyldig adresse).
          return (
            <>
              <Navbar title="Garn" back />
              <main className="content">
                <EmptyState
                  icon={<YarnIcon size={52} />}
                  title="Finner ikke garnet"
                  body="Det ble kanskje slettet. Gå tilbake til lageret for å velge et annet."
                />
                <button
                  type="button"
                  className="button button--prominent"
                  onClick={() => navigate('garn')}
                >
                  Til garnlageret
                </button>
              </main>
            </>
          )
        }
        return <YarnDetail yarn={yarn} />
      }
      return <YarnList />
    }

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
