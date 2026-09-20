import { useMemo, useState } from 'react'
import type { Person, Tie } from '../types'
import { useApp } from '../state/store'
import { searchPeople, TIE_LABELS, TIE_SUGGESTIONS } from '../lib/connections'
import { Avatar } from './Avatar'
import { distanceBetween } from '../lib/geo'

interface Props {
  /** The person we're adding family or friends to. */
  subject: Person
  kind: Tie
  onDone: () => void
}

/** Search everyone in the app and link them to this person. */
export function PeopleSearch({ subject, kind, onDone }: Props) {
  const { state, addConnection } = useApp()
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Person | null>(null)
  const [label, setLabel] = useState('')

  const results = useMemo(
    () => searchPeople(state, query, { excludeId: subject.id, excludeConnectedTo: subject.id }),
    [state, query, subject.id],
  )

  if (picked) {
    return (
      <div>
        <div className="between">
          <h2 style={{ fontSize: 20 }}>How do they know each other?</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => setPicked(null)}>
            Back
          </button>
        </div>

        <div className="card" style={{ marginTop: 14, display: 'flex', gap: 11, alignItems: 'center' }}>
          <Avatar person={subject} size={40} />
          <span style={{ fontSize: 17 }}>{kind === 'family' ? '🏡' : '🤝'}</span>
          <Avatar person={picked} size={40} />
          <div style={{ minWidth: 0 }}>
            <b>
              {subject.name} &amp; {picked.name}
            </b>
            <div className="tiny muted">{TIE_LABELS[kind]}</div>
          </div>
        </div>

        <div className="field">
          <label htmlFor="tie-label">In a word or two</label>
          <input
            id="tie-label"
            className="input"
            list="tie-suggestions"
            placeholder={TIE_SUGGESTIONS[kind][0]}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
          />
          <datalist id="tie-suggestions">
            {TIE_SUGGESTIONS[kind].map((s) => (
              <option value={s} key={s} />
            ))}
          </datalist>
          <div className="hint">
            Write it so it reads from both sides — "cousins", not "my cousin".
          </div>
        </div>

        <div className="chip-row" style={{ marginTop: 4 }}>
          {TIE_SUGGESTIONS[kind].slice(0, 5).map((s) => (
            <button key={s} className="toggle toggle-sm" onClick={() => setLabel(s)}>
              {s}
            </button>
          ))}
        </div>

        <div className="sheet-actions">
          <button
            className="btn btn-primary btn-block"
            onClick={() => {
              addConnection({
                aId: subject.id,
                bId: picked.id,
                kind,
                label: label.trim() || TIE_SUGGESTIONS[kind][TIE_SUGGESTIONS[kind].length - 1],
              })
              onDone()
            }}
          >
            Add to {subject.name}'s {kind === 'family' ? 'family' : 'friends'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ fontSize: 20 }}>
        Add to {subject.name}'s {kind === 'family' ? 'family' : 'friends'}
      </h2>
      <p className="tiny muted" style={{ marginTop: 6 }}>
        Search everyone in the app by name, city, work or what they're into.
      </p>

      <div className="field">
        <input
          className="input"
          placeholder="Search people…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          type="search"
        />
      </div>

      {results.length === 0 ? (
        <div className="empty" style={{ marginTop: 14 }}>
          <span className="emoji">🔍</span>
          <b>Nobody by that name</b>
          <p className="tiny" style={{ marginTop: 6 }}>
            Try a city, a job or an interest instead.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 6 }}>
          {results.map((person) => {
            const km = distanceBetween(subject.city, person.city)
            return (
              <button
                className="row"
                key={person.id}
                onClick={() => {
                  setPicked(person)
                  setLabel('')
                }}
              >
                <Avatar person={person} size={42} />
                <div className="row-main">
                  <div className="row-title" style={{ fontSize: 14.5 }}>
                    {person.name}, {person.age}
                    {person.managed && <span className="chip tiny">your roster</span>}
                  </div>
                  <div className="row-sub">
                    {person.job || person.education} · {person.city}
                    {km !== null && km > 0 ? ` · ${km} km` : ''}
                  </div>
                </div>
                <span className="muted">+</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
