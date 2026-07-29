/**
 * Liste over alle prosjektene dine, med mulighet til å legge til nye.
 * Port av ProsjektListeView.
 */

import { useState } from 'react'
import { actions, useStore } from '../store'
import { navigate, usePhotoUrl } from '../hooks'
import { ChevronRight, Plus, Scissors, Stack } from '../icons'
import { Dialog, EmptyState, Navbar } from './chrome'
import type { Project } from '../model'

function statusText(project: Project): string {
  if (project.rounds.length === 0) return 'Ingen omganger ennå'
  if (project.currentRoundIndex >= project.rounds.length) {
    return `Fullført · ${project.rounds.length} omganger`
  }
  return `Omgang ${project.currentRoundIndex + 1} av ${project.rounds.length}`
}

function Thumbnail({ project }: { project: Project }) {
  const url = usePhotoUrl(project.photoId)

  if (url) {
    return <img className="thumb" src={url} alt="" />
  }
  return (
    <div className="thumb thumb--empty">
      <Scissors />
    </div>
  )
}

export function ProjectList() {
  const { projects } = useStore()
  const [showingAddDialog, setShowingAddDialog] = useState(false)

  return (
    <>
      <Navbar
        title="Prosjekter"
        large
        trailing={
          <button
            type="button"
            className="iconbutton"
            onClick={() => setShowingAddDialog(true)}
          >
            <Plus size={24} />
            <span className="visually-hidden">Nytt prosjekt</span>
          </button>
        }
      />

      <main className="content">
        {projects.length === 0 ? (
          <EmptyState
            icon={<Stack size={52} />}
            title="Ingen prosjekter"
            body="Trykk på + for å lage ditt første prosjekt."
          />
        ) : (
          <div className="card">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                className="row"
                onClick={() => navigate(`prosjekter/${project.id}`)}
              >
                <Thumbnail project={project} />
                <span className="row__grow">
                  <span className="row__title">
                    {project.name.trim() === '' ? 'Uten navn' : project.name}
                  </span>
                  <span className="row__subtitle">{statusText(project)}</span>
                </span>
                <ChevronRight size={18} className="row__chevron" />
              </button>
            ))}
          </div>
        )}
      </main>

      {showingAddDialog && (
        <Dialog
          title="Nytt prosjekt"
          message="Gi prosjektet et navn."
          placeholder="Navn"
          confirmLabel="Legg til"
          onConfirm={(name) => {
            const project = actions.addProject(name)
            setShowingAddDialog(false)
            navigate(`prosjekter/${project.id}`)
          }}
          onCancel={() => setShowingAddDialog(false)}
        />
      )}
    </>
  )
}
