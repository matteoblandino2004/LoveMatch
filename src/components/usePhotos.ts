import { useEffect, useState } from 'react'
import { photoUrl } from '../lib/photos'

/** Resolve one photo id to a displayable URL. */
export function usePhoto(id: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    if (!id) {
      setUrl(null)
      return
    }
    photoUrl(id).then((resolved) => {
      if (live) setUrl(resolved)
    })
    return () => {
      live = false
    }
  }, [id])
  return url
}

/** Resolve a whole gallery, preserving order. */
export function usePhotoList(ids: string[]): (string | null)[] {
  const key = ids.join(',')
  const [urls, setUrls] = useState<(string | null)[]>(() => ids.map(() => null))
  useEffect(() => {
    let live = true
    Promise.all(ids.map((id) => photoUrl(id))).then((resolved) => {
      if (live) setUrls(resolved)
    })
    return () => {
      live = false
    }
    // `key` tracks the contents of `ids` without re-running on every new array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return urls
}
