import { useMemo, useRef, useState } from 'react'
import type { Person, SwipeDirection } from '../types'
import { useApp } from '../state/store'
import { buildDeck } from '../lib/matchmaking'
import { compatibility } from '../lib/compatibility'
import { SwipeDeck, type DeckHandle } from '../components/SwipeDeck'
import { Sheet } from '../components/Sheet'
import { ProfileDetail } from '../components/ProfileDetail'
import { Avatar } from '../components/Avatar'
import { displayRelationship } from '../lib/people'

export function SwipeScreen({ onAddProfile }: { onAddProfile: () => void }) {
  const { state, setActiveProfile, swipe, undoSwipe } = useApp()
  const deckRef = useRef<DeckHandle>(null)
  const [preview, setPreview] = useState<Person | null>(null)
  const [endorsing, setEndorsing] = useState<Person | null>(null)
  const [note, setNote] = useState('')

  const roster = state.rosterIds.map((id) => state.people[id]).filter(Boolean)
  const active = state.activeProfileId ? state.people[state.activeProfileId] : null

  const deck = useMemo(() => (active ? buildDeck(state, active) : []), [state, active])

  if (!active) {
    return (
      <div className="screen">
        <div className="empty" style={{ marginTop: 40 }}>
          <span className="emoji">🫶</span>
          <b>No one to swipe for yet</b>
          <p className="tiny" style={{ marginTop: 6 }}>
            Add yourself, or someone you'd love to see happy.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onAddProfile}>
            Create a profile
          </button>
        </div>
      </div>
    )
  }

  const asMatchmaker = active.managed?.kind === 'other'
  const canUndo = state.swipes.some((s) => s.profileId === active.id)

  function decide(person: Person, direction: SwipeDirection, matchmakerNote?: string) {
    if (!active) return
    const score = compatibility(active, person).score
    swipe({
      profileId: active.id,
      targetId: person.id,
      direction,
      byMatchmaker: asMatchmaker,
      note: matchmakerNote?.trim() || undefined,
      score,
    })
    setPreview(null)
  }

  function endorse() {
    if (!endorsing) return
    decide(endorsing, 'like', note)
    setEndorsing(null)
    setNote('')
  }

  return (
    <div className="screen">
      <div className="section-label" style={{ marginTop: 8 }}>
        Swiping for
      </div>
      <div style={{ display: 'flex', gap: 9, overflowX: 'auto', paddingBottom: 4 }}>
        {roster.map((person) => {
          const on = person.id === active.id
          return (
            <button
              key={person.id}
              onClick={() => setActiveProfile(person.id)}
              className="chip"
              style={{
                padding: '6px 12px 6px 6px',
                gap: 8,
                background: on ? 'rgba(255,77,121,0.16)' : undefined,
                borderColor: on ? 'rgba(255,77,121,0.4)' : undefined,
                color: on ? '#ffd0da' : undefined,
                cursor: 'pointer',
              }}
            >
              <Avatar person={person} size={26} />
              {person.name}
            </button>
          )
        })}
        <button className="chip" style={{ cursor: 'pointer' }} onClick={onAddProfile}>
          + Add
        </button>
      </div>

      <div className="card" style={{ marginTop: 12, padding: '11px 13px' }}>
        <div className="tiny">
          {asMatchmaker ? (
            <>
              You're the matchmaker for <b>{active.name}</b> ({displayRelationship(active).toLowerCase()}).
              Anything you like gets sent to them with your name on it.
            </>
          ) : (
            <>
              You're swiping for <b>yourself</b>. Your people can swipe for you too — their picks land
              in your notifications.
            </>
          )}
        </div>
      </div>

      {deck.length === 0 ? (
        <div className="empty" style={{ marginTop: 26 }}>
          <span className="emoji">🌾</span>
          <b>That's everyone for now</b>
          <p className="tiny" style={{ marginTop: 6 }}>
            {active.name} has seen every match in range. Widen the distance or age range in their
            profile, or swipe for someone else on your roster.
          </p>
          {canUndo && (
            <button className="btn btn-ghost" style={{ marginTop: 14 }} onClick={() => undoSwipe(active.id)}>
              ↩︎ Undo the last swipe
            </button>
          )}
        </div>
      ) : (
        <>
          <SwipeDeck
            ref={deckRef}
            entries={deck}
            viewer={active}
            onDecide={(person, direction) => decide(person, direction)}
            onOpen={(person) => setPreview(person)}
          />
          <div className="deck-actions">
            <button
              className="round round-sm"
              aria-label="Undo last swipe"
              disabled={!canUndo}
              style={{ opacity: canUndo ? 1 : 0.4 }}
              onClick={() => canUndo && undoSwipe(active.id)}
            >
              ↩︎
            </button>
            <button
              className="round round-pass"
              aria-label="Pass"
              onClick={() => deckRef.current?.fling('pass')}
            >
              ✕
            </button>
            <button
              className="round round-sm round-star"
              aria-label={asMatchmaker ? 'Like with a note' : 'Add a note'}
              onClick={() => {
                setEndorsing(deck[0].person)
                setNote('')
              }}
            >
              ★
            </button>
            <button
              className="round round-like"
              aria-label="Like"
              onClick={() => deckRef.current?.fling('like')}
            >
              ♥
            </button>
          </div>
          <p className="tiny muted center" style={{ marginTop: 10 }}>
            Drag the card, or use the buttons. ★ sends it with a note from you.
          </p>
        </>
      )}

      <Sheet open={!!preview} onClose={() => setPreview(null)} labelledBy="profile-sheet-title">
        {preview && (
          <>
            <ProfileDetail person={preview} viewer={active} />
            <div className="sheet-actions">
              <div style={{ display: 'flex', gap: 9 }}>
                <button className="btn btn-ghost" onClick={() => decide(preview, 'pass')}>
                  ✕ Pass
                </button>
                <button className="btn btn-primary btn-block" onClick={() => decide(preview, 'like')}>
                  ♥ Like for {active.name}
                </button>
              </div>
            </div>
          </>
        )}
      </Sheet>

      <Sheet open={!!endorsing} onClose={() => setEndorsing(null)}>
        {endorsing && (
          <>
            <h2 style={{ fontSize: 20 }}>
              {asMatchmaker ? `Tell ${active.name} why` : 'Add a note'}
            </h2>
            <p className="tiny muted" style={{ marginTop: 6 }}>
              {asMatchmaker
                ? `This note goes to ${active.name} with ${endorsing.name}'s profile, and shows up if they match.`
                : `A private note to yourself about ${endorsing.name}.`}
            </p>
            <div style={{ display: 'flex', gap: 11, alignItems: 'center', marginTop: 14 }}>
              <Avatar person={endorsing} size={44} />
              <div>
                <b>
                  {endorsing.name}, {endorsing.age}
                </b>
                <div className="tiny muted">{endorsing.city}</div>
              </div>
            </div>
            <div className="field">
              <textarea
                className="textarea"
                autoFocus
                placeholder="You two would not stop talking. Trust me on this one."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="sheet-actions">
              <button className="btn btn-primary btn-block" onClick={endorse}>
                ★ Send with note
              </button>
            </div>
          </>
        )}
      </Sheet>
    </div>
  )
}
