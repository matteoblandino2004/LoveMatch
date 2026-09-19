import type { Person, Tie } from '../types'
import { useApp } from '../state/store'
import { connectionsFor } from '../lib/connections'
import { Avatar } from './Avatar'
import { compatibility } from '../lib/compatibility'

interface Props {
  person: Person
  kind: Tie
  /** Open someone else's profile — how you walk from one person to their friends. */
  onOpenPerson?: (person: Person) => void
  /** Offered only where the viewer can edit this person's circle. */
  onAdd?: () => void
  /** Score each of them against this person, e.g. whoever you're swiping for. */
  scoreAgainst?: Person | null
  onRemove?: (connectionId: string) => void
}

/** One person's family or friends, as a browsable list. */
export function CirclePanel({ person, kind, onOpenPerson, onAdd, scoreAgainst, onRemove }: Props) {
  const { state } = useApp()
  const linked = connectionsFor(state, person.id, kind)
  const title = kind === 'family' ? 'Family' : 'Friends'
  const emoji = kind === 'family' ? '🏡' : '🤝'

  if (!linked.length && !onAdd) return null

  return (
    <>
      <div className="section-label">
        {emoji} {title}
        {linked.length > 0 && ` · ${linked.length}`}
      </div>

      {linked.length === 0 ? (
        <p className="tiny muted">
          Nobody added yet. {person.name}'s {title.toLowerCase()} are people you can set up too — or
          set your people up with.
        </p>
      ) : (
        <div className="stack">
          {linked.map(({ connection, person: other }) => {
            const score = scoreAgainst && scoreAgainst.id !== other.id
              ? compatibility(scoreAgainst, other).score
              : null
            return (
              <div className="row" key={connection.id} style={{ cursor: 'default' }}>
                <button
                  onClick={() => onOpenPerson?.(other)}
                  disabled={!onOpenPerson}
                  style={{ background: 'none', border: 0, padding: 0, cursor: onOpenPerson ? 'pointer' : 'default' }}
                  aria-label={`Open ${other.name}'s profile`}
                >
                  <Avatar person={other} size={42} />
                </button>
                <button
                  className="row-main"
                  onClick={() => onOpenPerson?.(other)}
                  disabled={!onOpenPerson}
                  style={{
                    background: 'none', border: 0, padding: 0, textAlign: 'left',
                    cursor: onOpenPerson ? 'pointer' : 'default',
                  }}
                >
                  <div className="row-title" style={{ fontSize: 14.5 }}>
                    {other.name}, {other.age}
                    {score !== null && <span className="chip tiny">{score}%</span>}
                  </div>
                  <div className="row-sub">
                    {connection.label} · {other.city}
                  </div>
                </button>
                {onRemove && (
                  <button
                    className="btn btn-ghost btn-sm"
                    aria-label={`Remove ${other.name}`}
                    onClick={() => onRemove(connection.id)}
                  >
                    ✕
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {onAdd && (
        <button className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 9 }} onClick={onAdd}>
          🔍 Search people to add
        </button>
      )}
    </>
  )
}
