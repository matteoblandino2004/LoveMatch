import type { Occasion, Person, Tie } from '../types'
import { compatibility, describePreferences, failedDealbreakers } from '../lib/compatibility'
import { Avatar } from './Avatar'
import { PhotoStrip } from './Photos'
import { CirclePanel } from './CirclePanel'
import { FacetList, ScoreRing } from './Meter'
import {
  FREQUENCY_LABELS, INTENT_LABELS, KIDS_LABELS, PET_LABELS, POLITICS_LABELS,
  FAITH_LABELS, SOCIAL_LABELS,
} from '../lib/options'
import { distanceBetween } from '../lib/geo'
import { OCCASION_KINDS, blendScore, fitLabel, occasionFit, whenLabel } from '../lib/occasions'
import { HAIR_LABELS, displayRelationship } from '../lib/people'

interface Props {
  person: Person
  viewer?: Person | null
  /** Open this person's matchmaker's circle — the other people they're setting up. */
  onOpenCircle?: () => void
  /** Open your own roster, scored against this person. */
  onCheckRoster?: () => void
  /** When set, also show how this person suits that specific occasion. */
  occasion?: Occasion | null
  /** Walk to someone in this person's family or friends. */
  onOpenPerson?: (person: Person) => void
  /** Offered only where the viewer can edit this person's circle. */
  onAddToCircle?: (kind: Tie) => void
  onRemoveConnection?: (connectionId: string) => void
}

/** Everything about one person, plus how they line up with `viewer`. */
export function ProfileDetail({
  person, viewer, onOpenCircle, onCheckRoster, occasion, onOpenPerson, onAddToCircle,
  onRemoveConnection,
}: Props) {
  const compat = viewer && viewer.id !== person.id ? compatibility(viewer, person) : null
  const fit = occasion && viewer ? occasionFit(occasion, viewer, person) : null
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

      {person.seeking && (
        <div className="chip chip-amber" style={{ marginTop: 12, whiteSpace: 'normal' }}>
          🗓️ Also looking for: {person.seeking.note}
        </div>
      )}

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

      {fit && occasion && compat && (
        <div className="card" style={{ marginTop: 16, borderColor: 'rgba(255,196,107,0.4)' }}>
          <div className="between">
            <div>
              <div className="tiny muted">
                {OCCASION_KINDS[occasion.kind].emoji} {occasion.title}
              </div>
              <b style={{ fontSize: 16 }}>{fitLabel(fit.score)} for this one</b>
              <div className="tiny muted" style={{ marginTop: 2 }}>
                {whenLabel(occasion.date)} · {occasion.city}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <b style={{ fontSize: 22 }}>{blendScore(compat.score, fit.score)}</b>
              <div className="tiny muted" style={{ fontSize: 10 }}>
                {compat.score}% them · {fit.score}% this
              </div>
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            {fit.facets.map((f) => (
              <div className="facet" key={f.label}>
                <div className="facet-head">
                  <b>{f.label}</b>
                  <span>
                    {Math.round(f.score * f.weight)} / {f.weight}
                  </span>
                </div>
                <div className="meter">
                  <i style={{ width: `${Math.max(2, f.score * 100)}%` }} />
                </div>
                <div className="facet-detail">{f.detail}</div>
              </div>
            ))}
          </div>

          {fit.reasons.length > 0 && (
            <div className="chip-row" style={{ marginTop: 11 }}>
              {fit.reasons.map((r) => (
                <span className="chip chip-mint" key={r}>
                  ✦ {r}
                </span>
              ))}
            </div>
          )}
          {fit.warnings.length > 0 && (
            <ul className="tiny muted" style={{ margin: '11px 0 0', paddingLeft: 18 }}>
              {fit.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
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
        <span className="chip">💇 {HAIR_LABELS[person.hair]} hair</span>
        {person.job && <span className="chip">💼 {person.job}</span>}
        {person.education && <span className="chip">🎓 {person.education}</span>}
        {person.hometown && <span className="chip">📍 From {person.hometown}</span>}
        <span className="chip">📏 {person.heightCm} cm</span>
      </div>

      <div className="section-label">Looking for</div>
      <div className="card tiny">{describePreferences(person)}</div>
      {viewer && failedDealbreakers(viewer, person).length > 0 && (
        <div className="card tiny" style={{ marginTop: 8, borderColor: 'rgba(255,107,129,0.45)' }}>
          <b>{viewer.name}'s dealbreakers rule this out:</b>{' '}
          {failedDealbreakers(viewer, person).join(', ').toLowerCase()}
        </div>
      )}

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

      <CirclePanel
        person={person}
        kind="family"
        onOpenPerson={onOpenPerson}
        onAdd={onAddToCircle ? () => onAddToCircle('family') : undefined}
        scoreAgainst={viewer}
        onRemove={onRemoveConnection}
      />
      <CirclePanel
        person={person}
        kind="friend"
        onOpenPerson={onOpenPerson}
        onAdd={onAddToCircle ? () => onAddToCircle('friend') : undefined}
        scoreAgainst={viewer}
        onRemove={onRemoveConnection}
      />

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
