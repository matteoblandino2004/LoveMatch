import type { Person } from '../types'
import { compatibility } from '../lib/compatibility'
import { Avatar } from './Avatar'
import { PhotoStrip } from './Photos'
import { FacetList, ScoreRing } from './Meter'
import {
  FREQUENCY_LABELS, INTENT_LABELS, KIDS_LABELS, PET_LABELS, POLITICS_LABELS,
  FAITH_LABELS, SOCIAL_LABELS,
} from '../lib/options'
import { distanceBetween } from '../lib/geo'
import { displayRelationship } from '../lib/people'

interface Props {
  person: Person
  viewer?: Person | null
  /** Open this person's matchmaker's circle — the other people they're setting up. */
  onOpenCircle?: () => void
  /** Open your own roster, scored against this person. */
  onCheckRoster?: () => void
}

/** Everything about one person, plus how they line up with `viewer`. */
export function ProfileDetail({ person, viewer, onOpenCircle, onCheckRoster }: Props) {
  const compat = viewer && viewer.id !== person.id ? compatibility(viewer, person) : null
  const km = viewer ? distanceBetween(viewer.city, person.city) : null

  return (
    <div>
      <div style={{ display: 'flex', gap: 13, alignItems: 'center' }}>
        <Avatar person={person} size={62} />
        <div style={{ minWidth: 0 }}>
          <h2 id="profile-sheet-title" style={{ fontSize: 22 }}>
            {person.name}, {person.age}
          </h2>
          <div className="muted tiny">
            {person.pronouns} · {person.city}
            {km !== null && km > 0 ? ` · ${km} km away` : ''}
          </div>
          {person.managed && (
            <div className="chip chip-hot" style={{ marginTop: 6 }}>
              {displayRelationship(person)}
            </div>
          )}
        </div>
      </div>

      <PhotoStrip person={person} />

      {person.bio && <p style={{ marginTop: 14 }}>{person.bio}</p>}

      {person.circle && (
        <div className="card" style={{ marginTop: 12, borderColor: 'rgba(255,196,107,0.35)' }}>
          <div className="tiny muted">Set up by {person.circle.matchmaker} · {person.circle.relationship}</div>
          <p style={{ marginTop: 6, fontSize: 14 }}>“{person.circle.pitch}”</p>
          {onOpenCircle && (
            <button className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 11 }} onClick={onOpenCircle}>
              See everyone {person.circle.matchmaker} is setting up ›
            </button>
          )}
        </div>
      )}

      {onCheckRoster && (
        <button className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 12 }} onClick={onCheckRoster}>
          ⇄ Who on your roster fits {person.name} best?
        </button>
      )}

      {person.managed?.pitch && (
        <div className="note-quote" style={{ marginTop: 12 }}>
          <b>Their matchmaker says:</b> {person.managed.pitch}
        </div>
      )}

      {compat && (
        <>
          <div className="card" style={{ marginTop: 16 }}>
            <ScoreRing score={compat.score} caption={`How ${person.name} lines up with ${viewer!.name}`} />
            <hr className="hr" />
            <FacetList compat={compat} />
          </div>

          {compat.flags.length > 0 && (
            <div className="card" style={{ marginTop: 12, borderColor: 'rgba(255,196,107,0.35)' }}>
              <div className="section-label" style={{ margin: '0 0 8px' }}>
                Worth knowing
              </div>
              <ul style={{ margin: 0, paddingLeft: 18 }} className="tiny">
                {compat.flags.map((f) => (
                  <li key={f} style={{ marginBottom: 4 }}>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="section-label">Basics</div>
      <div className="chip-row">
        <span className="chip">🎯 {INTENT_LABELS[person.intent]}</span>
        <span className="chip">👶 {KIDS_LABELS[person.lifestyle.kids]}</span>
        <span className="chip">🐾 {PET_LABELS[person.lifestyle.pets]}</span>
        <span className="chip">🍷 Drinks: {FREQUENCY_LABELS[person.lifestyle.drinking]}</span>
        <span className="chip">🚬 Smokes: {FREQUENCY_LABELS[person.lifestyle.smoking]}</span>
        <span className="chip">🏋️ Exercise: {FREQUENCY_LABELS[person.lifestyle.exercise]}</span>
        <span className="chip">🙏 {FAITH_LABELS[person.lifestyle.faith - 1]}</span>
        <span className="chip">🗳️ {POLITICS_LABELS[person.lifestyle.politics]}</span>
        <span className="chip">🔋 {SOCIAL_LABELS[person.lifestyle.socialEnergy - 1]}</span>
        {person.job && <span className="chip">💼 {person.job}</span>}
        {person.education && <span className="chip">🎓 {person.education}</span>}
        {person.hometown && <span className="chip">📍 From {person.hometown}</span>}
        <span className="chip">📏 {person.heightCm} cm</span>
      </div>

      {person.interests.length > 0 && (
        <>
          <div className="section-label">Into</div>
          <div className="chip-row">
            {person.interests.map((i) => {
              const isShared = compat?.shared.includes(i)
              return (
                <span className={`chip ${isShared ? 'chip-mint' : ''}`} key={i}>
                  {isShared ? '✦ ' : ''}
                  {i}
                </span>
              )
            })}
          </div>
        </>
      )}

      {person.prompts.length > 0 && (
        <>
          <div className="section-label">In their words</div>
          <div className="stack">
            {person.prompts.map((p) => (
              <div className="card" key={p.question}>
                <div className="tiny muted">{p.question}</div>
                <div style={{ marginTop: 5, fontSize: 15.5 }}>{p.answer}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {compat && (
        <>
          <div className="section-label">Conversation starters</div>
          <div className="stack">
            {compat.icebreakers.map((line) => (
              <div className="card tiny" key={line}>
                💬 {line}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
