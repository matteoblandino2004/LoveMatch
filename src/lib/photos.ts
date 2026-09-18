/**
 * Photo storage.
 *
 * Photos are far too big for localStorage (6 per person, a few hundred KB each),
 * so the bytes live in IndexedDB and profiles only carry photo ids. Everything
 * here degrades to "no photos" rather than throwing — a browser with storage
 * blocked should still be able to swipe.
 */

const DB_NAME = 'wingman-photos'
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

type Decoded = { source: CanvasImageSource; width: number; height: number; close: () => void }

/**
 * Get a drawable image out of a picked file.
 *
 * Three ways, because one browser or another refuses each of them: Safari only
 * learned `imageOrientation` recently, older WebKit has no createImageBitmap at
 * all, and an <img> element handles formats (HEIC on iOS) that createImageBitmap
 * will not touch.
 */
async function decodeImage(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    for (const options of [{ imageOrientation: 'from-image' as const }, undefined]) {
      try {
        const bitmap = await createImageBitmap(file, options)
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          close: () => bitmap.close(),
        }
      } catch {
        // Try the next way in.
      }
    }
  }

  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('decode failed'))
      el.src = url
    })
    return {
      source: img,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      close: () => URL.revokeObjectURL(url),
    }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}

/** Downscale and re-encode a picked file so six of them don't cost 30 MB. */
export async function processImage(file: File): Promise<Blob> {
  const decoded = await decodeImage(file)
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(decoded.width, decoded.height))
    const width = Math.max(1, Math.round(decoded.width * scale))
    const height = Math.max(1, Math.round(decoded.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(decoded.source, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    )
    return blob ?? file
  } finally {
    decoded.close()
  }
}

export type AddPhotoResult = { ok: true; id: string } | { ok: false; reason: string }

/** True when photos can be stored at all in this browser. */
export async function storageWorks(): Promise<boolean> {
  return (await openDb()) !== null
}

/** Process and store one picked file. */
export async function addPhoto(file: File): Promise<AddPhotoResult> {
  if (file.type && !file.type.startsWith('image/') && !/\.(jpe?g|png|gif|webp|heic|heif)$/i.test(file.name)) {
    return { ok: false, reason: `${file.name || 'That file'} is not an image.` }
  }

  let blob: Blob
  try {
    blob = await processImage(file)
  } catch {
    // Couldn't decode it. A small original is still worth keeping — Safari
    // displays HEIC fine even when it refuses to re-encode it.
    if (file.size > 0 && file.size < 4_000_000) blob = file
    else return { ok: false, reason: "This browser couldn't read that photo. A screenshot usually works." }
  }

  const id = photoId()
  const stored = await tx('readwrite', (store) => store.put(blob, id) as IDBRequest<IDBValidKey>)
  if (stored === null) {
    return {
      ok: false,
      reason: 'Storage is blocked here, so photos have nowhere to go. Private browsing or blocked site data will do this.',
    }
  }
  return { ok: true, id }
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
