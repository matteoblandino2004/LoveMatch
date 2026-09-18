import type { Person } from '../types'
import type { Ranked } from '../lib/circles'
import { Avatar } from './Avatar'
import { scoreLabel } from '../lib/compatibility'

interface Props {
  title: string
  subtitle: string
  entries: Ranked[]
  /** Label for the action button on an available row. */
  actionLabel: (entry: Ranked) => string
  onAction: (entry: Ranked) => void
  onOpenProfile: (entry: Ranked) => void
  emptyText: string
  /** Marked as "current" in the list, e.g. the profile you're swiping as. */
  highlightId?: string
  /** The person everyone here is being scored against. */
  anchor?: Person
}

/**
 * A matchmaker's people, ranked against one person. Powers both "who else is
 * this matchmaker setting up?" and "who on my roster fits this candidate?".
 */
export function CircleSheet({
  title, subtitle, entries, actionLabel, onAction, onOpenProfile, emptyText, highlightId, anchor,
}: Props) {
  const available = entries.filter((e) => !e.seen && e.eligible)

  return (
    <div>
      <h2 style={{ fontSize: 20 }}>{title}</h2>
      <p className="tiny muted" style={{ marginTop: 6 }}>
        {subtitle}
      </p>

      {anchor && (
        <div className="card" style={{ marginTop: 14, padding: 11, display: 'flex', gap: 11, alignItems: 'center' }}>
          <Avatar person={anchor} size={40} />
          <div style={{ minWidth: 0 }}>
            <div className="tiny muted">Scored against</div>
            <b>
              {anchor.name}, {anchor.age}
            </b>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="empty" style={{ marginTop: 18 }}>
          <span className="emoji">🤷</span>
          <b>{emptyText}</b>
        </div>
      ) : (
        <>
          {available.length > 0 && (
            <div className="section-label">
              Best fit first · {available.length} still open
            </div>
          )}
          <div className="stack" style={{ marginTop: entries.length && !available.length ? 16 : 0 }}>
            {entries.map((entry) => (
              <div
                className="card"
                key={entry.person.id}
                style={{ opacity: entry.seen || !entry.eligible ? 0.58 : 1, padding: 13 }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button
                    onClick={() => onOpenProfile(entry)}
                    style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
                    aria-label={`Open ${entry.person.name}'s profile`}
                  >
                    <Avatar person={entry.person} size={50} />
                  </button>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="row-title" style={{ fontSize: 15 }}>
                      {entry.person.name}, {entry.person.age}
                      {entry.person.id === highlightId && <span className="chip tiny">current</span>}
                    </div>
                    <div className="row-sub">
                      {entry.person.circle?.relationship ??
                        (entry.person.managed?.kind === 'self' ? 'You' : entry.person.managed?.relationship)}
                      {' · '}
                      {entry.person.city}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flex: 'none' }}>
                    <b style={{ fontSize: 17 }}>{entry.eligible ? `${entry.score}%` : '—'}</b>
                    <div className="tiny muted" style={{ fontSize: 10 }}>
                      {entry.eligible ? scoreLabel(entry.score) : 'not a fit'}
                    </div>
                  </div>
                </div>

                {entry.eligible && (
                  <div className="meter" style={{ marginTop: 10 }}>
                    <i style={{ width: `${Math.max(3, entry.score)}%` }} />
                  </div>
                )}

                {entry.person.circle?.pitch && (
                  <div className="note-quote" style={{ marginTop: 10 }}>
                    {entry.person.circle.matchmaker}: “{entry.person.circle.pitch}”
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => onOpenProfile(entry)}>
                    View
                  </button>
                  <button
                    className="btn btn-primary btn-sm btn-block"
                    disabled={entry.seen || !entry.eligible}
                    onClick={() => onAction(entry)}
                  >
                    {entry.seen
                      ? 'Already swiped'
                      : !entry.eligible
                        ? 'Not open to each other'
                        : actionLabel(entry)}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
