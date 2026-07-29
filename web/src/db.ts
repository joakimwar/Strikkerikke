/**
 * Bildelagring i IndexedDB.
 *
 * Prosjektbilder ligger her som Blob-er i stedet for i localStorage, fordi
 * base64-kodede bilder ville sprengt localStorage-kvoten (~5 MB) etter et
 * titalls prosjekter.
 */

const DB_NAME = 'ustastrikk'
const DB_VERSION = 1
const STORE = 'photos'

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE)
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
  return dbPromise
}

function transact<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const request = work(tx.objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      }),
  )
}

export async function putPhoto(id: string, blob: Blob): Promise<void> {
  await transact('readwrite', (store) => store.put(blob, id))
}

export async function getPhoto(id: string): Promise<Blob | undefined> {
  try {
    return await transact<Blob | undefined>('readonly', (store) => store.get(id))
  } catch {
    return undefined
  }
}

export async function deletePhoto(id: string): Promise<void> {
  try {
    await transact('readwrite', (store) => store.delete(id))
  } catch {
    // Bildet er "nice to have" – vi ignorerer feil i stillhet.
  }
}
