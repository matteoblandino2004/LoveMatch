import type { Person } from '../types'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

/**
 * Nobody uploads a photo to a local demo, so every profile gets a generated
 * one: a stable two-tone gradient derived from the profile's accent hue.
 */
export function Avatar({ person, size = 44 }: { person: Person; size?: number }) {
  const h = person.accent
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(140deg, hsl(${h} 72% 58%), hsl(${(h + 48) % 360} 70% 45%))`,
      }}
      aria-hidden="true"
    >
      {initials(person.name)}
    </div>
  )
}

/** The full-card "photo" behind a swipe card. */
export function PhotoBackdrop({ person }: { person: Person }) {
  const h = person.accent
  return (
    <div
      className="deck-photo"
      aria-hidden="true"
      style={{
        background: `
          radial-gradient(120% 80% at 18% 12%, hsl(${(h + 26) % 360} 78% 62%), transparent 58%),
          radial-gradient(110% 90% at 88% 22%, hsl(${(h + 300) % 360} 66% 52%), transparent 55%),
          linear-gradient(160deg, hsl(${h} 62% 42%), hsl(${(h + 330) % 360} 55% 22%))`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          paddingBottom: '22%',
          fontSize: 120,
          fontWeight: 900,
          color: 'rgba(255,255,255,0.17)',
          letterSpacing: '-0.05em',
        }}
      >
        {initials(person.name)}
      </div>
    </div>
  )
}
