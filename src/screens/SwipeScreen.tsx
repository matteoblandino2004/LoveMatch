import { useMemo, useRef, useState } from 'react'
import type { Occasion, Person, SwipeDirection, Tie } from '../types'
import { useApp } from '../state/store'
import { buildDeck } from '../lib/matchmaking'
import { compatibility, failedDealbreakers } from '../lib/compatibility'
import { OCCASION_KINDS, blendScore, companionLine, occasionFit, whenLabel } from '../lib/occasions'
import { circleFitFor, rosterFitFor, type Ranked } from '../lib/circles'
import { SwipeDeck, type DeckHandle } from '../components/SwipeDeck'
import { Sheet } from '../components/Sheet'
import { ProfileDetail } from '../components/ProfileDetail'
import { CircleSheet } from '../components/CircleSheet'
import { PeopleSearch } from '../components/PeopleSearch'
import { Avatar } from '../components/Avatar'
import { displayRelationship } from '../lib/people'
import { canSwipeFor, currentAccount, swipeableFor } from '../lib/accounts'
import { WingmanRequest } from '../components/WingmanRequest'
import { VIBES } from '../lib/occasions'

const VIBE_LABEL = Object.fromEntries(
  Object.entries(VIBES).map(([key, v]) => [key, v.label]),
) as Record<string, string>

/** Which "who else?" list is open: your own roster, or their matchmaker's people. */
type CircleView =
  | { kind: 'roster'; candidate: Person }
  | { kind: 'theirs'; candidate: Person; circleId: string; matchmaker: string }

interface SwipeScreenProps {
  onAddProfile: () => void
  /** The occasion the deck is filling, if any. */
  occasionId: string | null
  onSelectOccasion: (id: string | null) => void
  onCreateOccasion: () => void
}

export function SwipeScreen({
  onAddProfile, occasionId, onSelectOccasion, onCreateOccasion,
}: SwipeScreenProps) {
  const { state, setActiveProfile, swipe, undoSwipe, recordSwipe, sendInvite, removeConnection } =
    useApp()
  const deckRef = useRef<DeckHandle>(null)
  const [preview, setPreview] = useState<Person | null>(null)
  const [endorsing, setEndorsing] = useState<Person | null>(null)
  const [note, setNote] = useState('')
  const [circleView, setCircleView] = useState<CircleView | null>(null)
  const [linking, setLinking] = useState<{ person: Person; kind: Tie } | null>(null)
  const [asking, setAsking] = useState<Person | null>(null)

  const me = currentAccount(state)
  const roster = swipeableFor(state, state.currentAccountId)
  const active = state.activeProfileId ? state.people[state.activeProfileId] : null

  const occasion = useMemo<Occasion | null>(() => {
    const found = state.occasions.find((o) => o.id === occasionId) ?? null
    // An occasion only drives the deck while it belongs to the active profile
    // and still needs someone — once it's filled, the deck goes back to normal.
    if (!found || !found.open || found.profileId !== state.activeProfileId) return null
    return found
  }, [state.occasions, occasionId, state.activeProfileId])

  const openOccasions = useMemo(
    () => state.occasions.filter((o) => o.profileId === state.activeProfileId && o.open),
    [state.occasions, state.activeProfileId],
  )

  const deck = useMemo(() => {
    if (!active) return []
    const base = buildDeck(state, active)
    if (!occasion) return base
    // Filling an occasion re-scores the deck: general fit, plus fit for the night itself.
    const invited = new Set(
      state.invites.filter((i) => i.occasionId === occasion.id).map((i) => i.targetId),
    )
    return base
      .filter((entry) => !invited.has(entry.person.id))
      .map((entry) => {
        const fit = occasionFit(occasion, active, entry.person).score
        return { ...entry, fit, score: blendScore(entry.score, fit) }
      })
      .sort((a, b) => b.score - a.score)
  }, [state, active, occasion])

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

  /**
   * Act on `person` for a roster profile — the active one unless told otherwise.
   * With an occasion switched on, a right swipe is an invitation to that
   * occasion rather than a plain like.
   */
  function decide(
    person: Person,
    direction: SwipeDirection,
    opts: { matchmakerNote?: string; forProfile?: Person } = {},
  ) {
    const profile = opts.forProfile ?? active
    if (!profile) return
    const compat = compatibility(profile, person).score

    if (occasion && direction === 'like' && profile.id === occasion.profileId) {
      const fit = occasionFit(occasion, profile, person).score
      const blended = blendScore(compat, fit)
      recordSwipe({ profileId: profile.id, targetId: person.id, score: blended })
      sendInvite({
        occasionId: occasion.id,
        profileId: profile.id,
        targetId: person.id,
        score: blended,
        fit,
        byMatchmaker: profile.managed?.kind === 'other',
        note: opts.matchmakerNote?.trim() || undefined,
      })
      setPreview(null)
      return
    }

    swipe({
      profileId: profile.id,
      targetId: person.id,
      direction,
      byMatchmaker: profile.managed?.kind === 'other',
      note: opts.matchmakerNote?.trim() || undefined,
      score: compat,
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
      {/* Filling an occasion pins the deck to one person, so the switcher only
          gets in the way — the occasion card below names who it's for. */}
      {!occasion && (
        <>
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
          + Ask someone
        </button>
      </div>
        </>
      )}

      <div className="section-label" style={{ marginTop: occasion ? 8 : 14 }}>
        Looking for
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        <button
          className={`toggle toggle-sm ${occasion ? '' : 'on'}`}
          onClick={() => onSelectOccasion(null)}
          style={{ flex: 'none' }}
        >
          Anyone
        </button>
        {openOccasions.map((o) => (
          <button
            key={o.id}
            className={`toggle toggle-sm ${occasion?.id === o.id ? 'on' : ''}`}
            onClick={() => onSelectOccasion(o.id)}
            style={{ flex: 'none' }}
          >
            {OCCASION_KINDS[o.kind].emoji} {o.title}
          </button>
        ))}
        <button className="toggle toggle-sm" style={{ flex: 'none' }} onClick={onCreateOccasion}>
          + Occasion
        </button>
      </div>

      {occasion && (
        <div className="card" style={{ marginTop: 10, padding: '12px 13px', borderColor: 'rgba(255,196,107,0.35)' }}>
          <div className="row-title" style={{ fontSize: 14.5 }}>
            {OCCASION_KINDS[occasion.kind].emoji} {occasion.title}
          </div>
          <div className="tiny muted" style={{ marginTop: 3 }}>
            Finding someone for <b>{active.name}</b>
            {asMatchmaker ? ` · ${displayRelationship(active).toLowerCase()}` : ''}
          </div>
          <div className="tiny muted" style={{ marginTop: 3 }}>
            {whenLabel(occasion.date)} · {occasion.city} · {VIBE_LABEL[occasion.vibe]}
          </div>
          {companionLine(occasion) && (
            <div className="tiny muted" style={{ marginTop: 3 }}>
              {companionLine(occasion)}
            </div>
          )}
          <div className="tiny" style={{ marginTop: 7 }}>
            Scores blend the person and the night. Swipe right to ask them.
          </div>
        </div>
      )}

      {!occasion && (
      <div className="card" style={{ marginTop: 12, padding: '11px 13px' }}>
        <div className="tiny">
          {asMatchmaker ? (
            <>
              <b>{active.name}</b> approved you as their wingman. Anything you like gets sent to them
              with your name on it — and they can take the keys back whenever they like.
            </>
          ) : (
            <>
              You're swiping for <b>yourself</b>. Friends who ask — and whom you approve — can swipe
              for you too, and their picks land in your activity.
            </>
          )}
        </div>
      </div>
      )}

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
            occasion={occasion}
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
              aria-label={occasion ? 'Invite' : 'Like'}
              onClick={() => deckRef.current?.fling('like')}
            >
              {occasion ? '💌' : '♥'}
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
            {occasion
              ? 'Swipe right to ask them. ★ asks them with a note from you.'
              : 'Drag the card, or use the buttons. ★ sends it with a note from you.'}
          </p>
        </>
      )}

      <Sheet open={!!preview} onClose={() => setPreview(null)} labelledBy="profile-sheet-title">
        {preview && (
          <>
            <ProfileDetail
              person={preview}
              viewer={preview.id === active.id ? null : active}
              onOpenCircle={preview.circle ? () => openTheirCircle(preview) : undefined}
              onCheckRoster={
                roster.length > 1 && !preview.managed ? () => openRosterFit(preview) : undefined
              }
              occasion={preview.managed ? null : occasion}
              onOpenPerson={(person) => setPreview(person)}
              onAddToCircle={
                preview.managed ? (kind) => setLinking({ person: preview, kind }) : undefined
              }
              onRemoveConnection={preview.managed ? removeConnection : undefined}
              onAskWingman={
                me && preview.id !== me.id && !canSwipeFor(state, me.id, preview.id)
                  ? () => setAsking(preview)
                  : undefined
              }
            />
            <div className="sheet-actions">
              {preview.managed ? (
                <button className="btn btn-ghost btn-block" onClick={() => setPreview(null)}>
                  Done
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 9 }}>
                  <button className="btn btn-ghost" onClick={() => decide(preview, 'pass')}>
                    ✕ Pass
                  </button>
                  {failedDealbreakers(active, preview).length > 0 ? (
                    // Walking someone's friends can reach people the deck filters
                    // out. The rule stands, but a matchmaker can overrule it.
                    <button
                      className="btn btn-block"
                      style={{ borderColor: 'rgba(255,196,107,0.5)', color: '#ffdca6' }}
                      onClick={() => decide(preview, 'like')}
                    >
                      Against {active.name}'s rules — send anyway
                    </button>
                  ) : (
                    <button className="btn btn-primary btn-block" onClick={() => decide(preview, 'like')}>
                      {occasion ? `💌 Ask them for ${active.name}` : `♥ Like for ${active.name}`}
                    </button>
                  )}
                </div>
              )}
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

      <Sheet open={!!asking} onClose={() => setAsking(null)}>
        {asking && me && <WingmanRequest owner={asking} wingman={me} onDone={() => setAsking(null)} />}
      </Sheet>

      <Sheet open={!!linking} onClose={() => setLinking(null)}>
        {linking && (
          <PeopleSearch
            subject={linking.person}
            kind={linking.kind}
            onDone={() => setLinking(null)}
          />
        )}
      </Sheet>

      <Sheet open={!!endorsing} onClose={() => setEndorsing(null)}>
        {endorsing && (
          <>
            <h2 style={{ fontSize: 20 }}>
              {occasion
                ? `Ask ${endorsing.name} along`
                : asMatchmaker
                  ? `Tell ${active.name} why`
                  : 'Add a note'}
            </h2>
            <p className="tiny muted" style={{ marginTop: 6 }}>
              {occasion
                ? `Your note goes with the invitation to ${occasion.title.toLowerCase()}.`
                : asMatchmaker
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
                placeholder={
                  occasion
                    ? 'Fair warning: my entire family will be there and they will love you.'
                    : 'You two would not stop talking. Trust me on this one.'
                }
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="sheet-actions">
              <button className="btn btn-primary btn-block" onClick={endorse}>
                {occasion ? '💌 Send the invitation' : '★ Send with note'}
              </button>
            </div>
          </>
        )}
      </Sheet>
    </div>
  )
}
