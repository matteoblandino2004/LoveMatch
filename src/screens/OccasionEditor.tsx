import { useState } from 'react'
import type { Companion, Occasion, OccasionKind, Person, Vibe } from '../types'
import { OCCASION_KINDS, VIBES } from '../lib/occasions'
import { CITIES } from '../lib/geo'
import { Avatar } from '../components/Avatar'
import { displayRelationship } from '../lib/people'

interface Props {
  initial: Occasion
  roster: Person[]
  onSave: (occasion: Occasion) => void
  onCancel: () => void
  onDelete?: () => void
}

const KINDS = Object.keys(OCCASION_KINDS) as OccasionKind[]
const VIBE_KEYS = Object.keys(VIBES) as Vibe[]

export function OccasionEditor({ initial, roster, onSave, onCancel, onDelete }: Props) {
  const [o, setO] = useState<Occasion>(initial)
  const [error, setError] = useState('')

  const profile = roster.find((p) => p.id === o.profileId) ?? roster[0]
  const meta = OCCASION_KINDS[o.kind]

  const set = <K extends keyof Occasion>(key: K, value: Occasion[K]) =>
    setO((prev) => ({ ...prev, [key]: value }))

  function pickKind(kind: OccasionKind) {
    setO((prev) => ({
      ...prev,
      kind,
      vibe: OCCASION_KINDS[kind].defaultVibe,
      // A double date always has the pair who's hosting it.
      companions:
        kind === 'double-date' && prev.companions.length === 0
          ? [{ name: '', relationship: 'Me' }, { name: '', relationship: 'My partner' }]
          : prev.companions,
    }))
  }

  function setCompanion(index: number, patch: Partial<Companion>) {
    setO((prev) => {
      const companions = [...prev.companions]
      companions[index] = { ...companions[index], ...patch }
      return { ...prev, companions }
    })
  }

  function save() {
    if (!o.profileId) {
      setError('Who is this date for?')
      return
    }
    if (!o.title.trim()) {
      setError('Give it a name — "My cousin\'s wedding" is plenty.')
      return
    }
    onSave({
      ...o,
      title: o.title.trim(),
      city: o.city.trim() || profile?.city || '',
      details: o.details.trim(),
      companions: o.companions.filter((c) => c.name.trim()),
      byMatchmaker: profile?.managed?.kind === 'other',
    })
  }

  return (
    <div>
      <div className="between" style={{ marginBottom: 6 }}>
        <h2 style={{ fontSize: 20 }}>
          {meta.emoji} {initial.title ? 'Edit occasion' : 'Something to go to'}
        </h2>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>
          Close
        </button>
      </div>
      <p className="tiny muted">
        A real thing on the calendar beats "let's grab a drink sometime". People say yes to plans.
      </p>

      {error && (
        <div className="card tiny" style={{ marginTop: 12, borderColor: 'rgba(255,107,129,0.5)', color: '#ff9aa8' }}>
          {error}
        </div>
      )}

      <div className="field">
        <label>Who needs the date?</label>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {roster.map((person) => {
            const on = person.id === o.profileId
            return (
              <button
                key={person.id}
                className="chip"
                onClick={() => set('profileId', person.id)}
                style={{
                  padding: '6px 12px 6px 6px',
                  gap: 8,
                  cursor: 'pointer',
                  background: on ? 'rgba(255,77,121,0.16)' : undefined,
                  borderColor: on ? 'rgba(255,77,121,0.4)' : undefined,
                  color: on ? '#ffd0da' : undefined,
                }}
              >
                <Avatar person={person} size={24} />
                {person.name}
              </button>
            )
          })}
        </div>
        {profile && (
          <div className="hint">
            {profile.managed?.kind === 'self'
              ? "You'd be the one going."
              : `${profile.name} would be going — ${displayRelationship(profile).toLowerCase()}.`}
          </div>
        )}
      </div>

      <div className="field">
        <label>What is it?</label>
        <div className="chip-row">
          {KINDS.map((kind) => (
            <button
              key={kind}
              className={`toggle toggle-sm ${o.kind === kind ? 'on' : ''}`}
              onClick={() => pickKind(kind)}
            >
              {OCCASION_KINDS[kind].emoji} {OCCASION_KINDS[kind].label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="occ-title">Call it something</label>
        <input
          id="occ-title"
          className="input"
          placeholder={meta.example}
          value={o.title}
          onChange={(e) => set('title', e.target.value)}
        />
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="occ-date">When</label>
          <input
            id="occ-date"
            type="date"
            className="input"
            value={o.date}
            onChange={(e) => set('date', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="occ-city">Where</label>
          <input
            id="occ-city"
            className="input"
            list="cities"
            placeholder={profile?.city}
            value={o.city}
            onChange={(e) => set('city', e.target.value)}
          />
          <datalist id="cities">
            {CITIES.map((c) => (
              <option value={c.name} key={c.name} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="field">
        <label>What's the night like?</label>
        <div className="chip-row">
          {VIBE_KEYS.map((v) => (
            <button
              key={v}
              className={`toggle toggle-sm ${o.vibe === v ? 'on' : ''}`}
              onClick={() => set('vibe', v)}
            >
              {VIBES[v].label}
            </button>
          ))}
        </div>
        <div className="hint">{VIBES[o.vibe].blurb} — this decides who gets suggested.</div>
      </div>

      <div className="field">
        <label>Who else is coming?</label>
        <div className="hint">
          {o.kind === 'double-date'
            ? 'The other half of the double date — you and your partner, probably.'
            : 'Anyone worth mentioning. Leave it blank if it\'s just the two of them.'}
        </div>
        <div className="stack" style={{ marginTop: 8 }}>
          {o.companions.map((c, i) => (
            <div className="grid-2" key={i}>
              <input
                className="input"
                placeholder="Name"
                value={c.name}
                onChange={(e) => setCompanion(i, { name: e.target.value })}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  className="input"
                  placeholder="Who they are"
                  value={c.relationship}
                  onChange={(e) => setCompanion(i, { relationship: e.target.value })}
                />
                <button
                  className="btn btn-ghost btn-sm"
                  aria-label="Remove"
                  onClick={() =>
                    setO((prev) => ({ ...prev, companions: prev.companions.filter((_, x) => x !== i) }))
                  }
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setO((prev) => ({ ...prev, companions: [...prev.companions, { name: '', relationship: '' }] }))}
          >
            + Add someone
          </button>
        </div>
      </div>

      <div className="field">
        <label htmlFor="occ-details">What should they know?</label>
        <textarea
          id="occ-details"
          className="textarea"
          placeholder="Black tie. My entire family will interrogate you. Open bar, so it evens out."
          value={o.details}
          onChange={(e) => set('details', e.target.value)}
        />
      </div>

      {onDelete && (
        <button className="btn btn-danger btn-block" style={{ marginTop: 6 }} onClick={onDelete}>
          Delete this occasion
        </button>
      )}

      <div className="sheet-actions">
        <button className="btn btn-primary btn-block" onClick={save}>
          Save occasion
        </button>
      </div>
    </div>
  )
}
