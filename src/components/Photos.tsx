import { useRef, useState } from 'react'
import type { Person } from '../types'
import { usePhoto, usePhotoList } from './usePhotos'
import { MAX_PHOTOS, addPhoto, deletePhotos } from '../lib/photos'

/** The photo filling a swipe card, with Hinge-style progress pips. */
export function CardPhoto({ person, index }: { person: Person; index: number }) {
  const urls = usePhotoList(person.photos)
  const url = urls[Math.min(index, urls.length - 1)] ?? null
  if (!person.photos.length) return null
  return (
    <>
      {url && <img className="card-photo" src={url} alt="" draggable={false} />}
      {person.photos.length > 1 && (
        <div className="pips" aria-hidden="true">
          {person.photos.map((id, i) => (
            <i key={id} className={i === index ? 'on' : ''} />
          ))}
        </div>
      )}
    </>
  )
}

/** Scrollable strip of every photo, used on the detail sheet. */
export function PhotoStrip({ person }: { person: Person }) {
  const urls = usePhotoList(person.photos)
  if (!person.photos.length) return null
  return (
    <div className="photo-strip">
      {urls.map((url, i) =>
        url ? (
          <img key={person.photos[i]} src={url} alt={`${person.name}, photo ${i + 1}`} loading="lazy" />
        ) : (
          <div key={person.photos[i]} className="photo-skeleton" />
        ),
      )}
    </div>
  )
}

/** A single stored photo as a plain image — used for avatars. */
export function PhotoThumb({ id, size }: { id: string; size: number }) {
  const url = usePhoto(id)
  if (!url) return null
  return (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: 'cover', display: 'block' }}
      draggable={false}
    />
  )
}

interface EditorProps {
  person: Person
  onChange: (photos: string[]) => void
}

/** Add, reorder and remove up to six photos. */
export function PhotoEditor({ person, onChange }: EditorProps) {
  const urls = usePhotoList(person.photos)
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(0)
  const [error, setError] = useState('')

  const slots = MAX_PHOTOS - person.photos.length

  async function onPick(files: FileList | null) {
    if (!files?.length) return
    setError('')
    const picked = Array.from(files).slice(0, slots)
    setBusy(picked.length)
    const added: string[] = []
    for (const file of picked) {
      const id = await addPhoto(file)
      if (id) added.push(id)
      setBusy((n) => n - 1)
    }
    if (!added.length) {
      setError("Couldn't save those — this browser may be blocking storage.")
    } else if (added.length < picked.length) {
      setError(`Saved ${added.length} of ${picked.length}.`)
    }
    if (added.length) onChange([...person.photos, ...added])
    if (input.current) input.current.value = ''
  }

  function remove(id: string) {
    onChange(person.photos.filter((p) => p !== id))
    void deletePhotos([id])
  }

  function move(index: number, delta: number) {
    const next = [...person.photos]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="field">
      <label>
        Photos — {person.photos.length}/{MAX_PHOTOS}
      </label>
      <div className="hint">The first one is their main photo. Tap ◀ ▶ to reorder.</div>

      <div className="photo-grid">
        {person.photos.map((id, i) => (
          <div className="photo-slot filled" key={id}>
            {urls[i] ? <img src={urls[i]!} alt={`Photo ${i + 1}`} /> : <div className="photo-skeleton" />}
            {i === 0 && <span className="photo-tag">Main</span>}
            <div className="photo-tools">
              <button aria-label="Move earlier" onClick={() => move(i, -1)} disabled={i === 0}>
                ◀
              </button>
              <button aria-label="Remove photo" onClick={() => remove(id)}>
                ✕
              </button>
              <button
                aria-label="Move later"
                onClick={() => move(i, 1)}
                disabled={i === person.photos.length - 1}
              >
                ▶
              </button>
            </div>
          </div>
        ))}

        {Array.from({ length: busy }, (_, i) => (
          <div className="photo-slot" key={`busy-${i}`}>
            <span className="tiny muted">Saving…</span>
          </div>
        ))}

        {slots - busy > 0 && (
          <button className="photo-slot add" onClick={() => input.current?.click()}>
            <span style={{ fontSize: 24 }}>＋</span>
            <span className="tiny muted">Add photo</span>
          </button>
        )}
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => void onPick(e.target.files)}
      />

      {error && (
        <div className="tiny" style={{ color: '#ff9aa8', marginTop: 8 }}>
          {error}
        </div>
      )}
      <div className="hint">
        Photos stay on this device. They're resized before saving, so six of them cost about a
        megabyte.
      </div>
    </div>
  )
}
