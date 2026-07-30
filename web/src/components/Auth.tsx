/**
 * Innlogging og registrering. Vises i stedet for resten av appen når ingen er
 * innlogget, siden alt av data ligger på kontoen.
 */

import { useState } from 'react'
import { auth } from '../auth'
import { Scissors } from '../icons'
import { Section } from './chrome'

type Mode = 'inn' | 'ny'

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('inn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmationSent, setConfirmationSent] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return

    setBusy(true)
    setError(null)

    const result =
      mode === 'inn' ? await auth.signIn(email, password) : await auth.signUp(email, password)

    // Ved vellykket innlogging byttes hele skjermen ut av App, så vi trenger
    // ikke rydde tilstanden her.
    if (!result.ok) setError(result.error)
    else if (result.needsConfirmation) setConfirmationSent(true)

    setBusy(false)
  }

  if (confirmationSent) {
    return (
      <div className="auth">
        <main className="content auth__body">
          <Section card={false}>
            <div className="auth__brand">
              <Scissors size={44} />
              <h1 className="auth__title">Sjekk e-posten din</h1>
              <p className="auth__subtitle">
                Vi har sendt en bekreftelseslenke til {email.trim()}. Trykk på lenken, og kom
                tilbake hit for å logge inn.
              </p>
            </div>
          </Section>

          <Section card={false}>
            <button
              type="button"
              className="button button--plain"
              onClick={() => {
                setConfirmationSent(false)
                setMode('inn')
                setPassword('')
              }}
            >
              Tilbake til innlogging
            </button>
          </Section>
        </main>
      </div>
    )
  }

  return (
    <div className="auth">
      <main className="content auth__body">
        <div className="auth__brand">
          <Scissors size={44} />
          <h1 className="auth__title">Strikkerikke</h1>
          <p className="auth__subtitle">
            Logg inn for å få prosjektene, omgangene og strikketiden din på alle enhetene dine.
          </p>
        </div>

        <form onSubmit={submit}>
          <Section header="E-post">
            <input
              className="field"
              type="email"
              autoComplete="email"
              placeholder="din@epost.no"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Section>

          <Section
            header="Passord"
            footer={mode === 'ny' ? 'Passordet må ha minst 6 tegn.' : undefined}
          >
            <input
              className="field"
              type="password"
              autoComplete={mode === 'inn' ? 'current-password' : 'new-password'}
              placeholder="Passord"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Section>

          {error && (
            <Section card={false}>
              <p className="auth__error" role="alert">
                {error}
              </p>
            </Section>
          )}

          <Section card={false}>
            <button type="submit" className="button button--prominent" disabled={busy}>
              {busy ? 'Vent litt …' : mode === 'inn' ? 'Logg inn' : 'Lag konto'}
            </button>
          </Section>
        </form>

        <Section card={false}>
          <button
            type="button"
            className="button button--plain"
            onClick={() => {
              setMode(mode === 'inn' ? 'ny' : 'inn')
              setError(null)
            }}
          >
            {mode === 'inn' ? 'Har du ikke konto? Lag en' : 'Har du konto allerede? Logg inn'}
          </button>
        </Section>
      </main>
    </div>
  )
}
