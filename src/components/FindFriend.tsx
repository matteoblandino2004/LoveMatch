import { useMemo, useState } from 'react'
import type { Person } from '../types'
import { useApp } from '../state/store'
import { searchPeople } from '../lib/connections'
import { canSwipeFor, describeTie, grantBetween } from '../lib/accounts'
import { Avatar } from './Avatar'
import { distanceBetween } from '../lib/geo'

interface Props {
  me: Person
  onPick: (person: Person) => void
}

/**
 * Find someone who is already on Wingman. Their profile is already written —
 * their photos, their bio, their preferences — so being their wingman takes
 * nothing but their approval.
 */
export function FindFriend({ me, onPick }: Props) {
  const { state } = useApp()
  const [query, setQuery] = useState('')

  const results = useMemo(
    () => searchPeople(state, query, { excludeId: me.id, limit: 25 }),
    [state, query, me.id],
  )

  return (
    <div>
      <h2 style={{ fontSize: 20 }}>Find a friend on Wingman</h2>
      <p className="tiny muted" style={{ marginTop: 6 }}>
        If they already have an account, you don't have to write anything. Their photos, bio and
        preferences are already there — they just have to approve you.
      </p>

      <div className="field">
        <input
          className="input"
          type="search"
          placeholder="Search by name, city, work or interests"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {results.length === 0 ? (
        <div className="empty" style={{ marginTop: 14 }}>
          <span className="emoji">🔍</span>
          <b>Nobody by that name</b>
          <p className="tiny" style={{ marginTop: 6 }}>
            If they're not on Wingman yet, go back and set them up instead.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 4 }}>
          {results.map((person) => {
            const km = distanceBetween(me.city, person.city)
            const grant = grantBetween(state, person.id, me.id)
            const already = canSwipeFor(state, me.id, person.id)
            const waiting = grant?.status === 'pending'
            return (
              <button
                className="row"
                key={person.id}
                disabled={already || waiting}
                style={{ opacity: already || waiting ? 0.55 : 1 }}
                onClick={() => onPick(person)}
              >
                <Avatar person={person} size={46} />
                <div className="row-main">
                  <div className="row-title" style={{ fontSize: 14.5 }}>
                    {person.name}, {person.age}
                    {person.photos.length > 0 && <span className="chip tiny">{person.photos.length} photos</span>}
                  </div>
                  <div className="row-sub">
                    {describeTie(state, person.id, me.id)} · {person.city}
                    {km !== null && km > 0 ? ` · ${km} km` : ''}
                  </div>
                </div>
                <span className="tiny muted">
                  {already ? 'Already yours' : waiting ? 'Asked' : 'Ask ›'}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
