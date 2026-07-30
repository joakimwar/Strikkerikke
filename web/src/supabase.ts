/**
 * Supabase-klienten. Adressen og nøkkelen kommer fra miljøvariabler som Vite
 * bygger inn i bunten (se .env.example).
 *
 * Den publiserbare nøkkelen er ment å ligge åpent i klientkoden – det er
 * radsikkerheten (RLS) i databasen som holder dataene til hver bruker adskilt,
 * ikke hemmeligholdet av nøkkelen.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * Satt hvis miljøvariablene mangler. App-en viser meldingen i stedet for å
 * kaste under import – et kast her ville gitt en blank side uten forklaring.
 */
export const configError =
  !url || !publishableKey
    ? 'Appen mangler oppsettet mot Supabase (VITE_SUPABASE_URL og VITE_SUPABASE_PUBLISHABLE_KEY). Bygget må kjøres på nytt med disse satt.'
    : null

export const supabase = createClient<Database>(
  // Reservverdiene brukes bare når configError er satt, og da vises feilskjermen
  // i stedet for resten av appen. De finnes kun for at createClient ikke kaster.
  url || 'https://mangler.supabase.co',
  publishableKey || 'mangler',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Vi bruker e-post og passord, ikke lenker med token i adressen.
      detectSessionInUrl: false,
    },
  },
)
