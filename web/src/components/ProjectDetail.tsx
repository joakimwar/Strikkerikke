/**
 * Detaljer for ett prosjekt: rediger navn, bilde, notater, omganger og strikketid.
 * Port av ProsjektDetaljView.
 */

import { useRef, useState } from 'react'
import { actions } from '../store'
import { navigate, usePhotoUrl } from '../hooks'
import { downscaleImage } from '../image'
import { elapsed, type Project } from '../model'
import {
  ArrowDown,
  ArrowUp,
  Photo,
  Play,
  Plus,
  Timer,
  Trash,
} from '../icons'
import { Dialog, Navbar, Section } from './chrome'
import { ElapsedTime } from './ElapsedTime'

export function ProjectDetail({ project }: { project: Project }) {
  const photoUrl = usePhotoUrl(project.photoPath)
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  // Bildet skal opp til Supabase Storage, så det tar litt tid på mobilnett.
  const [uploading, setUploading] = useState(false)

  const pickPhoto = async (file: File) => {
    setUploading(true)
    try {
      await actions.setPhoto(project.id, await downscaleImage(file))
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <Navbar title={project.name.trim() === '' ? 'Prosjekt' : project.name} back />

      <main className="content">
        <Section header="Navn">
          <input
            className="field"
            placeholder="Prosjektnavn"
            value={project.name}
            onChange={(event) => actions.setName(project.id, event.target.value)}
          />
        </Section>

        <Section header="Bilde">
          {photoUrl && <img className="photo" src={photoUrl} alt="Prosjektbilde" />}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="visually-hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void pickPhoto(file)
              event.target.value = ''
            }}
          />
          <button
            type="button"
            className="row row--action"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Photo />
            <span>
              {uploading
                ? 'Laster opp …'
                : project.photoPath === null
                  ? 'Legg til bilde'
                  : 'Bytt bilde'}
            </span>
          </button>

          {project.photoPath !== null && !uploading && (
            <button
              type="button"
              className="row row--destructive"
              onClick={() => void actions.setPhoto(project.id, null)}
            >
              <Trash />
              <span>Fjern bilde</span>
            </button>
          )}
        </Section>

        <Section header="Notater">
          <textarea
            className="field"
            placeholder="Skriv notater om prosjektet …"
            rows={3}
            value={project.notes}
            onChange={(event) => actions.setNotes(project.id, event.target.value)}
          />
        </Section>

        <Section
          header="Strikketid"
          footer="Timeren starter automatisk når du trykker «Start strikking», og pauses når du går tilbake hit."
        >
          <div className="row">
            <Timer className="row__chevron" />
            <span className="row__grow">
              <ElapsedTime stopwatch={project.stopwatch} />
            </span>
            <button
              type="button"
              className="button button--plain button--destructive"
              style={{ width: 'auto' }}
              disabled={elapsed(project.stopwatch, Date.now()) === 0}
              onClick={() => actions.resetProjectTimer(project.id)}
            >
              Nullstill
            </button>
          </div>
        </Section>

        <Section
          header="Omganger"
          footer={
            project.rounds.length === 0
              ? 'Legg til omgangene du vil følge. Skriv mønsteret i hvert felt.'
              : undefined
          }
        >
          {project.rounds.map((round, index) => (
            <div className="round" key={round.id}>
              <div className="round__head">
                <span className="round__number">Omgang {index + 1}</span>
                <button
                  type="button"
                  className="round__tool"
                  disabled={index === 0}
                  onClick={() => actions.moveRound(project.id, index, -1)}
                >
                  <ArrowUp size={18} />
                  <span className="visually-hidden">Flytt opp</span>
                </button>
                <button
                  type="button"
                  className="round__tool"
                  disabled={index === project.rounds.length - 1}
                  onClick={() => actions.moveRound(project.id, index, 1)}
                >
                  <ArrowDown size={18} />
                  <span className="visually-hidden">Flytt ned</span>
                </button>
                <button
                  type="button"
                  className="round__tool round__tool--destructive"
                  onClick={() => actions.deleteRound(project.id, round.id)}
                >
                  <Trash size={18} />
                  <span className="visually-hidden">Slett omgang {index + 1}</span>
                </button>
              </div>
              <textarea
                className="field"
                placeholder="Mønster for denne omgangen"
                rows={1}
                value={round.pattern}
                onChange={(event) =>
                  actions.setRoundPattern(project.id, round.id, event.target.value)
                }
              />
            </div>
          ))}

          <button
            type="button"
            className="row row--action"
            onClick={() => actions.addRound(project.id)}
          >
            <Plus />
            <span>Legg til omgang</span>
          </button>
        </Section>

        <Section card={false}>
          <button
            type="button"
            className="button button--prominent"
            disabled={project.rounds.length === 0}
            onClick={() => navigate(`prosjekter/${project.id}/strikk`)}
          >
            <Play size={20} />
            Start strikking
          </button>
        </Section>

        <Section card={false}>
          <button
            type="button"
            className="button button--plain button--destructive"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash size={18} />
            Slett prosjekt
          </button>
        </Section>
      </main>

      {confirmingDelete && (
        <Dialog
          title="Slett prosjekt?"
          message="Prosjektet, omgangene og strikketiden forsvinner for godt."
          confirmLabel="Slett"
          destructive
          onConfirm={() => {
            actions.deleteProject(project.id)
            navigate('prosjekter')
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </>
  )
}
