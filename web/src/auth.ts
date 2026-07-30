/**
 * Innlogging med e-post og passord.
 *
 * Økten holdes av supabase-js (i localStorage) og fornyes automatisk, så
 * brukeren forblir innlogget mellom besøk. Vi speiler den inn i React med
 * useSyncExternalStore, på samme måte som lageret i store.ts.
 */

import { useSyncExternalStore } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { flushPending } from './store'

export interface AuthState {
  session: Session | null
  /** 'laster' til vi vet om det finnes en lagret økt, deretter 'klar'. */
  status: 'laster' | 'klar'
}

let authState: AuthState = { session: null, status: 'laster' }
const listeners = new Set<() => void>()

function set(next: AuthState) {
  authState = next
  listeners.forEach((listener) => listener())
}

// Fyres også ved oppstart (INITIAL_SESSION), så den lagrede økta plukkes opp her.
supabase.auth.onAuthStateChange((_event, session) => {
  set({ session, status: 'klar' })
})

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getSnapshot = () => authState

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Oversetter Supabase sine engelske feilmeldinger til norsk. Ukjente feil
 * vises som en generell melding – vi vil ikke lekke tekniske detaljer i UI-et.
 */
function norwegianError(message: string): string {
  const text = message.toLowerCase()

  if (text.includes('invalid login credentials')) return 'Feil e-post eller passord.'
  if (text.includes('email not confirmed')) {
    return 'Du må bekrefte e-postadressen din først. Sjekk innboksen (og søppelposten).'
  }
  if (text.includes('already registered') || text.includes('already been registered')) {
    return 'Det finnes allerede en konto med denne e-posten. Prøv å logge inn i stedet.'
  }
  if (text.includes('password should be at least')) return 'Passordet må ha minst 6 tegn.'
  if (text.includes('unable to validate email') || text.includes('invalid email')) {
    return 'E-postadressen ser ikke gyldig ut.'
  }
  if (text.includes('rate limit') || text.includes('too many requests')) {
    return 'For mange forsøk. Vent litt før du prøver igjen.'
  }
  if (text.includes('failed to fetch') || text.includes('network')) {
    return 'Fikk ikke kontakt med serveren. Sjekk nettforbindelsen.'
  }
  return 'Noe gikk galt. Prøv igjen.'
}

export type AuthResult =
  | { ok: true; needsConfirmation: boolean }
  | { ok: false; error: string }

export const auth = {
  async signIn(email: string, password: string): Promise<AuthResult> {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) return { ok: false, error: norwegianError(error.message) }
    return { ok: true, needsConfirmation: false }
  },

  async signUp(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })
    if (error) return { ok: false, error: norwegianError(error.message) }

    // Er e-postbekreftelse slått på i Supabase, kommer det ingen økt tilbake –
    // da må brukeren trykke på lenken i e-posten før hen kan logge inn.
    return { ok: true, needsConfirmation: data.session === null }
  },

  async signOut() {
    // Skriv ferdig det som ligger og venter (f.eks. et notat brukeren nettopp
    // skrev) før vi mister tilgangen til å skrive det.
    flushPending()
    await supabase.auth.signOut()
  },
}
