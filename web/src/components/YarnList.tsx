/**
 * Garnlageret: alle garnene dine, med mulighet til å legge til nye.
 * Bygget over samme lest som ProsjektListeView.
 */

import { useState } from 'react'
import { actions, useStore } from '../store'
import { navigate } from '../hooks'
import { ChevronRight, Plus, Yarn as YarnIcon } from '../icons'
import { Dialog, EmptyState, Navbar } from './chrome'
import { totalSkeins, type Yarn } from '../model'

/** «1 farge» / «3 farger», «1 nøste» / «7 nøster». */
const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`

function statusText(yarn: Yarn): string {
  const parts: string[] = []

  const weight = yarn.weight.trim()
  if (weight !== '') parts.push(weight)

  if (yarn.colors.length === 0) {
    parts.push('Ingen farger ennå')
  } else {
    parts.push(plural(yarn.colors.length, 'farge', 'farger'))
    parts.push(plural(totalSkeins(yarn), 'nøste', 'nøster'))
  }

  return parts.join(' · ')
}

export function YarnList() {
  const { yarns } = useStore()
  const [showingAddDialog, setShowingAddDialog] = useState(false)

  return (
    <>
      <Navbar
        title="Garnlager"
        large
        trailing={
          <button type="button" className="iconbutton" onClick={() => setShowingAddDialog(true)}>
            <Plus size={24} />
            <span className="visually-hidden">Nytt garn</span>
          </button>
        }
      />

      <main className="content">
        {yarns.length === 0 ? (
          <EmptyState
            icon={<YarnIcon size={52} />}
            title="Tomt garnlager"
            body="Trykk på + for å legge inn det første garnet ditt."
          />
        ) : (
          <div className="card">
            {yarns.map((yarn) => (
              <button
                key={yarn.id}
                type="button"
                className="row"
                onClick={() => navigate(`garn/${yarn.id}`)}
              >
                <span className="thumb thumb--empty">
                  <YarnIcon />
                </span>
                <span className="row__grow">
                  <span className="row__title">
                    {yarn.name.trim() === '' ? 'Uten navn' : yarn.name}
                  </span>
                  <span className="row__subtitle">{statusText(yarn)}</span>
                </span>
                <ChevronRight size={18} className="row__chevron" />
              </button>
            ))}
          </div>
        )}
      </main>

      {showingAddDialog && (
        <Dialog
          title="Nytt garn"
          message="Hva heter garnet?"
          placeholder="Navn"
          confirmLabel="Legg til"
          onConfirm={(name) => {
            const yarn = actions.addYarn(name)
            setShowingAddDialog(false)
            navigate(`garn/${yarn.id}`)
          }}
          onCancel={() => setShowingAddDialog(false)}
        />
      )}
    </>
  )
}
