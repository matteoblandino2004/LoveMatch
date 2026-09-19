import { useState } from 'react'
import type { Person, Tie } from '../types'
import { useApp } from '../state/store'
import { Avatar } from '../components/Avatar'
import { Sheet } from '../components/Sheet'
import { ProfileDetail } from '../components/ProfileDetail'
import { displayRelationship } from '../lib/people'
import { buildDeck, eligibleCount } from '../lib/matchmaking'
import { OCCASION_KINDS, whenLabel } from '../lib/occasions'
import { PeopleSearch } from '../components/PeopleSearch'
import { WingmanRequest } from '../components/WingmanRequest'
import { connectionsFor, searchPeople } from '../lib/connections'
import {
  canSwipeFor, currentAccount, describeTie, grantBetween, isOnDevice, requestsAwaiting,
  requestsSent, swipeableFor,
} from '../lib/accounts'

interface Props {
  onAdd: (kind: 'self' | 'other') => void
  onSwitchAccount: () => void
  onEdit: (person: Person) => void
  onSwipeFor: (id: string) => void
  onAddOccasion: (id: string) => void
}

/** Everyone you're matchmaking for — plus yourself, if you're in the game. */
export function RosterScreen({ onAdd, onSwitchAccount, onEdit, onSwipeFor, onAddOccasion }: Props) {
  const { state, removeConnection, respondToRequest, revokeGrant } = useApp()
  const [open, setOpen] = useState<Person | null>(null)
  const [linking, setLinking] = useState<{ person: Person; kind: Tie } | null>(null)
  const [asking, setAsking] = useState<Person | null>(null)
  const [query, setQuery] = useState('')

  const found = query.trim() ? searchPeople(state, query, { limit: 12 }) : []

  const me = currentAccount(state)
  const roster = swipeableFor(state, state.currentAccountId)
  const awaiting = requestsAwaiting(state, state.currentAccountId)
  const sent = requestsSent(state, state.currentAccountId)

  function statsFor(person: Person) {
    const swipes = state.swipes.filter((s) => s.profileId === person.id)
    const likes = swipes.filter((s) => s.direction === 'like')
    const matches = state.matches.filter((m) => m.profileId === person.id && !m.archived)
    const remaining = buildDeck(state, person).length
    const avg = likes.length
      ? Math.round(likes.reduce((sum, s) => sum + s.score, 0) / likes.length)
      : 0
    const occasions = state.occasions.filter((o) => o.profileId === person.id && o.open)
    const family = connectionsFor(state, person.id, 'family').length
    const friends = connectionsFor(state, person.id, 'friend').length
    return {
      family, friends,
      likes: likes.length, matches: matches.length, remaining, avg,
      pool: eligibleCount(state, person), occasions,
    }
  }

  return (
    <div className="screen">
      <h1 className="screen-title">Your people</h1>
      <p className="screen-sub">
        You, plus everyone who has approved you as their wingman.
      </p>

      {awaiting.length > 0 && (
        <>
          <div className="section-label">Waiting on you</div>
          <div className="stack">
            {awaiting.map((grant) => {
              const asker = state.people[grant.wingmanId]
              if (!asker) return null
              return (
                <div className="card" key={grant.id}>
                  <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                    <Avatar person={asker} size={42} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="row-title" style={{ fontSize: 14.5 }}>
                        {asker.name} wants to swipe for you
                      </div>
                      <div className="row-sub">{describeTie(state, me!.id, asker.id)}</div>
                    </div>
                  </div>
                  {grant.message && (
                    <div className="note-quote" style={{ marginTop: 10 }}>
                      “{grant.message}”
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => respondToRequest(grant.id, 'declined')}
                    >
                      No thanks
                    </button>
                    <button
                      className="btn btn-primary btn-sm btn-block"
                      onClick={() => respondToRequest(grant.id, 'approved')}
                    >
                      Let them swipe for me
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {sent.length > 0 && (
        <>
          <div className="section-label">Waiting on them</div>
          <div className="stack">
            {sent.map((grant) => {
              const owner = state.people[grant.ownerId]
              if (!owner) return null
              return (
                <div className="row" key={grant.id} style={{ cursor: 'default' }}>
                  <Avatar person={owner} size={38} />
                  <div className="row-main">
                    <div className="row-title" style={{ fontSize: 14 }}>
                      {owner.name}
                    </div>
                    <div className="row-sub">
                      {isOnDevice(state, owner.id)
                        ? 'Switch to their account to answer'
                        : 'Asked — no answer yet'}
                    </div>
                  </div>
                  <span className="chip chip-amber tiny">Pending</span>
                </div>
              )
            })}
          </div>
        </>
      )}

      <div className="stack" style={{ marginTop: 18 }}>
        {roster.map((person) => {
          const s = statsFor(person)
          const isSelf = person.managed?.kind === 'self'
          return (
            <div className="card" key={person.id}>
              <button
                className="between"
                style={{ width: '100%', background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left' }}
                onClick={() => setOpen(person)}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
                  <Avatar person={person} size={48} />
                  <div style={{ minWidth: 0 }}>
                    <div className="row-title">
                      {person.name}, {person.age}
                      {isSelf && <span className="chip chip-hot">You</span>}
                    </div>
                    <div className="row-sub">
                      {isSelf ? person.city : `${displayRelationship(person)} · ${person.city}`}
                    </div>
                  </div>
                </div>
                <span className="muted">›</span>
              </button>

              {!isSelf && person.managed && !person.managed.consented && (
                <div className="note-quote" style={{ marginTop: 10 }}>
                  They haven't said yes to this yet. Ask them before you send matches their way.
                </div>
              )}

              <div className="grid-3" style={{ marginTop: 12 }}>
                <Stat value={s.likes} label="likes sent" />
                <Stat value={s.matches} label="matches" />
                <Stat value={s.remaining} label="left to see" />
              </div>

              {(s.family > 0 || s.friends > 0) && (
                <div className="chip-row" style={{ marginTop: 11 }}>
                  {s.family > 0 && <span className="chip">🏡 {s.family} family</span>}
                  {s.friends > 0 && <span className="chip">🤝 {s.friends} friends</span>}
                </div>
              )}

              {s.occasions.length > 0 && (
                <div className="chip-row" style={{ marginTop: 11 }}>
                  {s.occasions.map((o) => (
                    <span className="chip chip-amber" key={o.id}>
                      {OCCASION_KINDS[o.kind].emoji} {o.title} · {whenLabel(o.date)}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn btn-primary btn-sm btn-block" onClick={() => onSwipeFor(person.id)}>
                  {isSelf ? 'Swipe' : `Swipe for ${person.name}`}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => onEdit(person)}>
                  Edit
                </button>
              </div>
              {!isSelf && (
                <button
                  className="btn btn-ghost btn-sm btn-block"
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    const grant = grantBetween(state, person.id, me!.id)
                    if (grant) revokeGrant(grant.id)
                  }}
                >
                  Stop being {person.name}'s wingman
                </button>
              )}
              <button
                className="btn btn-ghost btn-sm btn-block"
                style={{ marginTop: 8 }}
                onClick={() => onAddOccasion(person.id)}
              >
                🗓️ Give {isSelf ? 'yourself' : person.name} something to go to
              </button>

              {s.avg > 0 && (
                <p className="tiny muted" style={{ marginTop: 9 }}>
                  Average compatibility of the people you've liked for {isSelf ? 'yourself' : person.name}:{' '}
                  <b>{s.avg}%</b> · {s.pool} people in range
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="section-label">🔍 Look someone up</div>
      <input
        className="input"
        type="search"
        placeholder="Search everyone — name, city, work, interests"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query.trim() !== '' && (
        <div style={{ marginTop: 10 }}>
          {found.length === 0 ? (
            <p className="tiny muted">Nobody matches that.</p>
          ) : (
            found.map((person) => (
              <button className="row" key={person.id} onClick={() => setOpen(person)}>
                <Avatar person={person} size={40} />
                <div className="row-main">
                  <div className="row-title" style={{ fontSize: 14.5 }}>
                    {person.name}, {person.age}
                    {person.managed && <span className="chip tiny">your roster</span>}
                  </div>
                  <div className="row-sub">
                    {person.job || person.education} · {person.city}
                  </div>
                </div>
                <span className="muted">›</span>
              </button>
            ))
          )}
        </div>
      )}

      <div className="section-label">Add someone</div>
      <div className="stack">
        <button className="row" onClick={() => onAdd('other')}>
          <div style={{ fontSize: 22 }}>➕</div>
          <div className="row-main">
            <div className="row-title">Set someone up</div>
            <div className="row-sub" style={{ whiteSpace: 'normal' }}>
              Make them an account. They approve you before you can swipe for them.
            </div>
          </div>
        </button>
        <button className="row" onClick={onSwitchAccount}>
          <div style={{ fontSize: 22 }}>🔄</div>
          <div className="row-main">
            <div className="row-title">Switch account</div>
            <div className="row-sub">Use the app as someone else signed in here</div>
          </div>
        </button>
      </div>

      <Sheet open={!!open} onClose={() => setOpen(null)} labelledBy="profile-sheet-title">
        {open && (
          <>
            <ProfileDetail
              person={open}
              onOpenPerson={(person) => setOpen(person)}
              onAddToCircle={open.managed ? (kind) => setLinking({ person: open, kind }) : undefined}
              onRemoveConnection={open.managed ? removeConnection : undefined}
              onAskWingman={
                me && open.id !== me.id && !canSwipeFor(state, me.id, open.id)
                  ? () => setAsking(open)
                  : undefined
              }
            />
            <div className="sheet-actions">
              {open.managed ? (
                <div style={{ display: 'flex', gap: 9 }}>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      onEdit(open)
                      setOpen(null)
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-primary btn-block"
                    onClick={() => {
                      onSwipeFor(open.id)
                      setOpen(null)
                    }}
                  >
                    Swipe for {open.name}
                  </button>
                </div>
              ) : (
                <button className="btn btn-ghost btn-block" onClick={() => setOpen(null)}>
                  Done
                </button>
              )}
            </div>
          </>
        )}
      </Sheet>

      <Sheet open={!!linking} onClose={() => setLinking(null)}>
        {linking && (
          <PeopleSearch subject={linking.person} kind={linking.kind} onDone={() => setLinking(null)} />
        )}
      </Sheet>

      <Sheet open={!!asking} onClose={() => setAsking(null)}>
        {asking && me && (
          <WingmanRequest owner={asking} wingman={me} onDone={() => setAsking(null)} />
        )}
      </Sheet>
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 4px', background: 'rgba(0,0,0,0.22)', borderRadius: 12 }}>
      <div style={{ fontSize: 19, fontWeight: 800 }}>{value}</div>
      <div className="tiny muted" style={{ fontSize: 10.5 }}>
        {label}
      </div>
    </div>
  )
}
