/**
 * Prosjektbilder i Supabase Storage.
 *
 * Erstatter den tidligere IndexedDB-lagringen, slik at bildene følger kontoen
 * og dukker opp igjen på en ny telefon. Bøtta er privat: filene ligger under
 * <bruker-id>/<uuid>.jpg, og policyene sjekker at første mappenivå er din egen
 * bruker-id. Derfor må visning gå via en signert URL.
 */

import { supabase } from './supabase'

const BUCKET = 'prosjektbilder'

/** Hvor lenge en signert bilde-URL er gyldig. En time holder for en økt. */
const SIGNED_URL_SECONDS = 60 * 60

/** Bøtta godtar bare disse typene (se migrasjonen). */
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])

/**
 * Laster opp et bilde og returnerer stien det ble lagret på.
 * Hver opplasting får sin egen uuid, så et bytte av bilde aldri kan vises som
 * det gamle fra en mellomlagret URL.
 */
export async function uploadPhoto(userId: string, blob: Blob): Promise<string> {
  // downscaleImage gir oss JPEG, men faller tilbake til originalen hvis
  // nedskaleringen feiler – da kan typen være en annen.
  const contentType = ALLOWED.has(blob.type) ? blob.type : 'image/jpeg'
  const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg'
  const path = `${userId}/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType })
  if (error) throw new Error(error.message)

  return path
}

/** Signert URL for visning, eller null hvis bildet ikke lar seg hente. */
export async function photoUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS)

  return error ? null : data.signedUrl
}

/** Sletter et bilde. Feil ignoreres – bildet er «nice to have». */
export async function deletePhoto(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path])
}
