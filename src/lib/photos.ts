/**
 * Photo storage.
 *
 * Photos are far too big for localStorage (6 per person, a few hundred KB each),
 * so the bytes live in IndexedDB and profiles only carry photo ids. Everything
 * here degrades to "no photos" rather than throwing — a browser with storage
 * blocked should still be able to swipe.
 */

const DB_NAME = 'lovematch-photos'
const STORE = 'photos'
const DB_VERSION = 1

export const MAX_PHOTOS = 6
/** Longest edge after downscaling. Plenty for a phone screen, small on disk. */
const MAX_EDGE = 1440
const JPEG_QUALITY = 0.78

let dbPromise: Promise<IDBDatabase | null> | null = null

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null)
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
      request.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return dbPromise
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null)
        try {
          const request = run(db.transaction(STORE, mode).objectStore(STORE))
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => resolve(null)
        } catch {
          resolve(null)
        }
      }),
  )
}

function photoId(): string {
  return `ph_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`
}

/** Downscale and re-encode a picked file so six of them don't cost 30 MB. */
export async function processImage(file: File): Promise<Blob> {
  // `from-image` applies the EXIF rotation, so portrait photos aren't sideways.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  )
  return blob ?? file
}

/** Process and store one picked file. Returns the id to put on the profile. */
export async function addPhoto(file: File): Promise<string | null> {
  try {
    const blob = await processImage(file)
    const id = photoId()
    const stored = await tx('readwrite', (store) => store.put(blob, id) as IDBRequest<IDBValidKey>)
    if (stored === null) return null
    return id
  } catch {
    return null
  }
}

const urlCache = new Map<string, Promise<string | null>>()

/**
 * An object URL for a stored photo. Cached for the life of the page: the same
 * photo appears on a card, an avatar and a detail sheet at once, and re-reading
 * it each time makes images flicker.
 */
export function photoUrl(id: string): Promise<string | null> {
  const cached = urlCache.get(id)
  if (cached) return cached
  const pending = tx<Blob>('readonly', (store) => store.get(id) as IDBRequest<Blob>).then((blob) =>
    blob ? URL.createObjectURL(blob) : null,
  )
  urlCache.set(id, pending)
  return pending
}

export async function deletePhotos(ids: string[]): Promise<void> {
  for (const id of ids) {
    const pending = urlCache.get(id)
    urlCache.delete(id)
    if (pending) {
      const url = await pending
      if (url) URL.revokeObjectURL(url)
    }
    await tx('readwrite', (store) => store.delete(id) as unknown as IDBRequest<undefined>)
  }
}

export async function clearAllPhotos(): Promise<void> {
  for (const [, pending] of urlCache) {
    const url = await pending
    if (url) URL.revokeObjectURL(url)
  }
  urlCache.clear()
  await tx('readwrite', (store) => store.clear() as unknown as IDBRequest<undefined>)
}
