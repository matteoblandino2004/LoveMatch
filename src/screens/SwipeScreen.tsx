import { useMemo, useRef, useState } from 'react'
import type { Person, SwipeDirection } from '../types'
import { useApp } from '../state/store'
import { buildDeck } from '../lib/matchmaking'
import { compatibility } from '../lib/compatibility'
import { circleFitFor, rosterFitFor, type Ranked } from '../lib/circles'
import { SwipeDeck, type DeckHandle } from '../components/SwipeDeck'
import { Sheet } from '../components/Sheet'
import { ProfileDetail } from '../components/ProfileDetail'
import { CircleSheet } from '../components/CircleSheet'
import { Avatar } from '../components/Avatar'
import { displayRelationship } from '../lib/people'

/** Which "who else?" list is open: your own roster, or their matchmaker's people. */
type CircleView =
  | { kind: 'roster'; candidate: Person }
  | { kind: 'theirs'; candidate: Person; circleId: string; matchmaker: string }

export function SwipeScreen({ onAddProfile }: { onAddProfile: () => void }) {
  const { state, setActiveProfile, swipe, undoSwipe } = useApp()
  const deckRef = useRef<DeckHandle>(null)
  const [preview, setPreview] = useState<Person | null>(null)
  const [endorsing, setEndorsing] = useState<Person | null>(null)
  const [note, setNote] = useState('')
  const [circleView, setCircleView] = useState<CircleView | null>(null)

  const roster = state.rosterIds.map((id) => state.people[id]).filter(Boolean)
  const active = state.activeProfileId ? state.people[state.activeProfileId] : null

  const deck = useMemo(() => (active ? buildDeck(state, active) : []), [state, active])

  const circleEntries = useMemo<Ranked[]>(() => {
    if (!circleView) return []
    if (circleView.kind === 'roster') return rosterFitFor(state, circleView.candidate)
    return active ? circleFitFor(state, active, circleView.circleId) : []
  }, [circleView, state, active])

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

  /** Swipe on `person` for a roster profile — the active one unless told otherwise. */
  function decide(
    person: Person,
    direction: SwipeDirection,
    opts: { matchmakerNote?: string; forProfile?: Person } = {},
  ) {
    const profile = opts.forProfile ?? active
    if (!profile) return
    const score = compatibility(profile, person).score
    swipe({
      profileId: profile.id,
      targetId: person.id,
      direction,
      byMatchmaker: profile.managed?.kind === 'other',
      note: opts.matchmakerNote?.trim() || undefined,
      score,
    })
    setPreview(null)
  }

  function openTheirCircle(person: Person) {
    if (!person.circle) return
    setPreview(null)
    setCircleView({
      kind: 'theirs',
      candidate: person,
      circleId: person.circle.id,
      matchmaker: person.circle.matchmaker,
    })
  }

  function openRosterFit(person: Person) {
    setPreview(null)
    setCircleView({ kind: 'roster', candidate: person })
  }

  function endorse() {
    if (!endorsing) return
    decide(endorsing, 'like', { matchmakerNote: note })
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
            onOpenCircle={openTheirCircle}
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

          {roster.length > 1 && (
            <button
              className="btn btn-ghost btn-block"
              style={{ marginTop: 12 }}
              onClick={() => openRosterFit(deck[0].person)}
            >
              ⇄ Better for someone else on your roster?
            </button>
          )}

          <p className="tiny muted center" style={{ marginTop: 10 }}>
            Drag the card, or use the buttons. ★ sends it with a note from you.
          </p>
        </>
      )}

      <Sheet open={!!preview} onClose={() => setPreview(null)} labelledBy="profile-sheet-title">
        {preview && (
          <>
            <ProfileDetail
              person={preview}
              viewer={active}
              onOpenCircle={() => openTheirCircle(preview)}
              onCheckRoster={roster.length > 1 ? () => openRosterFit(preview) : undefined}
            />
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

      <Sheet open={!!circleView} onClose={() => setCircleView(null)}>
        {circleView?.kind === 'roster' && (
          <CircleSheet
            title={`Who fits ${circleView.candidate.name} best?`}
            subtitle={`Everyone on your roster, scored against ${circleView.candidate.name}. Send the like from whoever actually fits — it doesn't have to be ${active.name}.`}
            entries={circleEntries}
            anchor={circleView.candidate}
            highlightId={active.id}
            emptyText="Add another profile to compare"
            actionLabel={(entry) => `♥ Like for ${entry.person.name}`}
            onAction={(entry) => {
              decide(circleView.candidate, 'like', { forProfile: entry.person })
              setCircleView(null)
            }}
            onOpenProfile={(entry) => {
              setCircleView(null)
              setPreview(entry.person)
            }}
          />
        )}
        {circleView?.kind === 'theirs' && (
          <CircleSheet
            title={`${circleView.matchmaker}'s circle`}
            subtitle={`${circleView.matchmaker} is setting up more than one person. Here's everyone they know, scored against ${active.name} — ${circleView.candidate.name} might not be the best of them.`}
            entries={circleEntries}
            anchor={active}
            emptyText={`${circleView.matchmaker} isn't setting up anyone else`}
            actionLabel={() => `♥ Like for ${active.name}`}
            onAction={(entry) => {
              decide(entry.person, 'like')
              setCircleView(null)
            }}
            onOpenProfile={(entry) => {
              setCircleView(null)
              setPreview(entry.person)
            }}
          />
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
