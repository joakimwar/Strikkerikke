/**
 * Detaljer for ett garn: navn, tykkelse, og fargene du har det i.
 *
 * Hver farge har sin egen fargekode, sitt antall nøster og kan settes av til
 * et prosjekt. Har du ikke prosjektet ennå, kan du opprette det rett fra
 * nedtrekkslista – da slipper du å gå veien om prosjektfanen.
 */

import { useState } from 'react'
import { actions, useStore } from '../store'
import { navigate } from '../hooks'
import { totalSkeins, type Project, type Yarn, type YarnColor } from '../model'
import { Minus, Plus, Trash } from '../icons'
import { Dialog, Navbar, Section } from './chrome'

/** Verdien som betyr «ingen» i nedtrekkslista – tom streng, som <option> uten value. */
const NONE = ''
/** Sentinelverdi: brukeren vil lage et nytt prosjekt i stedet for å velge et. */
const NEW_PROJECT = '__nytt__'

const projectTitle = (project: Project) =>
  project.name.trim() === '' ? 'Uten navn' : project.name

function ColorEditor({
  yarn,
  color,
  index,
  projects,
  onNewProject,
}: {
  yarn: Yarn
  color: YarnColor
  index: number
  projects: Project[]
  onNewProject: (colorId: string) => void
}) {
  // Peker fargen på et prosjekt vi ikke har (slettet i en annen fane), ville
  // <select> stått tom. Vis heller at koblingen finnes, men er ukjent her.
  const missingProject = color.projectId !== null && !projects.some((p) => p.id === color.projectId)

  return (
    <div className="color">
      <div className="color__head">
        <span className="color__number">Farge {index + 1}</span>
        <button
          type="button"
          className="round__tool round__tool--destructive"
          onClick={() => actions.deleteColor(yarn.id, color.id)}
        >
          <Trash size={18} />
          <span className="visually-hidden">Slett farge {index + 1}</span>
        </button>
      </div>

      <input
        className="field"
        placeholder="Fargekode, f.eks. 1015 Lys grå"
        value={color.code}
        onChange={(event) => actions.setColorCode(yarn.id, color.id, event.target.value)}
      />

      <div className="color__line">
        <span className="color__label">Nøster</span>
        <div className="stepper">
          <button
            type="button"
            className="stepper__button"
            disabled={color.skeins === 0}
            onClick={() => actions.setColorSkeins(yarn.id, color.id, color.skeins - 1)}
          >
            <Minus size={18} />
            <span className="visually-hidden">Ett nøste færre</span>
          </button>
          <span className="stepper__value">{color.skeins}</span>
          <button
            type="button"
            className="stepper__button"
            onClick={() => actions.setColorSkeins(yarn.id, color.id, color.skeins + 1)}
          >
            <Plus size={18} />
            <span className="visually-hidden">Ett nøste til</span>
          </button>
        </div>
      </div>

      <div className="color__line">
        <span className="color__label">Prosjekt</span>
        <select
          className="select"
          value={color.projectId ?? NONE}
          onChange={(event) => {
            const value = event.target.value
            // Ved «Nytt prosjekt …» lar vi tilstanden stå urørt: <select> er
            // kontrollert, så den hopper tilbake til forrige valg av seg selv
            // hvis dialogen blir avbrutt.
            if (value === NEW_PROJECT) onNewProject(color.id)
            else actions.setColorProject(yarn.id, color.id, value === NONE ? null : value)
          }}
        >
          <option value={NONE}>Ingen</option>
          {missingProject && <option value={color.projectId ?? ''}>Ukjent prosjekt</option>}
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {projectTitle(project)}
            </option>
          ))}
          <option value={NEW_PROJECT}>+ Nytt prosjekt …</option>
        </select>
      </div>
    </div>
  )
}

export function YarnDetail({ yarn }: { yarn: Yarn }) {
  const { projects } = useStore()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  // Fargen som venter på et nytt prosjekt, eller null når dialogen er lukket.
  const [newProjectFor, setNewProjectFor] = useState<string | null>(null)

  const skeins = totalSkeins(yarn)

  return (
    <>
      <Navbar title={yarn.name.trim() === '' ? 'Garn' : yarn.name} back />

      <main className="content">
        <Section header="Navn">
          <input
            className="field"
            placeholder="Garnnavn"
            value={yarn.name}
            onChange={(event) => actions.setYarnName(yarn.id, event.target.value)}
          />
        </Section>

        <Section
          header="Tykkelse"
          footer="Skriv det som står på banderolen, for eksempel «Tynt garn, pinne 3» eller «Aran»."
        >
          <input
            className="field"
            placeholder="Tykkelse eller størrelse"
            value={yarn.weight}
            onChange={(event) => actions.setYarnWeight(yarn.id, event.target.value)}
          />
        </Section>

        <Section
          header="Farger"
          footer={
            yarn.colors.length === 0
              ? 'Legg til hver farge du har av dette garnet, med antall nøster.'
              : `Til sammen ${skeins} ${skeins === 1 ? 'nøste' : 'nøster'}.`
          }
        >
          {yarn.colors.map((color, index) => (
            <ColorEditor
              key={color.id}
              yarn={yarn}
              color={color}
              index={index}
              projects={projects}
              onNewProject={setNewProjectFor}
            />
          ))}

          <button
            type="button"
            className="row row--action"
            onClick={() => actions.addColor(yarn.id)}
          >
            <Plus />
            <span>Legg til farge</span>
          </button>
        </Section>

        <Section card={false}>
          <button
            type="button"
            className="button button--plain button--destructive"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash size={18} />
            Slett garn
          </button>
        </Section>
      </main>

      {newProjectFor !== null && (
        <Dialog
          title="Nytt prosjekt"
          message="Prosjektet blir laget og fargen settes av til det."
          placeholder="Navn"
          confirmLabel="Opprett"
          onConfirm={(name) => {
            const project = actions.addProject(name)
            actions.setColorProject(yarn.id, newProjectFor, project.id)
            setNewProjectFor(null)
          }}
          onCancel={() => setNewProjectFor(null)}
        />
      )}

      {confirmingDelete && (
        <Dialog
          title="Slett garn?"
          message="Garnet og alle fargene forsvinner for godt. Prosjektene beholdes."
          confirmLabel="Slett"
          destructive
          onConfirm={() => {
            actions.deleteYarn(yarn.id)
            navigate('garn')
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </>
  )
}
