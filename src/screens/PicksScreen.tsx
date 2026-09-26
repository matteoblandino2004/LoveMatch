import { useMemo, useRef, useState } from 'react'
import type { Person, SwipeDirection } from '../types'
import { useApp } from '../state/store'
import { currentAccount } from '../lib/accounts'
import { suggestionsFor } from '../lib/suggestions'
import { SwipeDeck, type DeckHandle } from '../components/SwipeDeck'
import { Sheet } from '../components/Sheet'
import { ProfileDetail } from '../components/ProfileDetail'
import { Avatar } from '../components/Avatar'
import { timeAgo } from '../lib/time'

/**
 * What your friends think. Every pick a wingman sent you, one card at a time —
 * swipe right if you agree with them, left if you don't.
 */
export function PicksScreen({ onGoSwipe }: { onGoSwipe: () => void }) {
  const { state, respondToSuggestion } = useApp()
  const deckRef = useRef<DeckHandle>(null)
  const [preview, setPreview] = useState<Person | null>(null)

  const me = currentAccount(state)
  const waiting = useMemo(() => suggestionsFor(state, state.currentAccountId), [state])
  const decided = useMemo(
    () => [
      ...suggestionsFor(state, state.currentAccountId, 'accepted'),
      ...suggestionsFor(state, state.currentAccountId, 'passed'),
    ].sort((a, b) => (b.suggestion.respondedAt ?? 0) - (a.suggestion.respondedAt ?? 0)),
    [state],
  )

  const entries = useMemo(
    () => waiting.map((card) => ({ person: card.target, score: card.suggestion.score })),
    [waiting],
  )

  if (!me) return null

  const top = waiting[0]

  function decide(person: Person, direction: SwipeDirection) {
    const card = waiting.find((c) => c.target.id === person.id)
    if (!card) return
    respondToSuggestion(card.suggestion.id, direction === 'like')
    setPreview(null)
  }

  return (
    <div className="screen">
      <h1 className="screen-title">What your friends think</h1>
      <p className="screen-sub">
        People your wingmen picked for you. They can't match you with anyone — that part is yours.
      </p>

      {waiting.length === 0 ? (
        <>
          <div className="empty" style={{ marginTop: 24 }}>
            <span className="emoji">💡</span>
            <b>Nothing waiting on you</b>
            <p className="tiny" style={{ marginTop: 6 }}>
              When a friend swipes for you, their pick lands here and you get the final say.
            </p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onGoSwipe}>
              Swipe for yourself instead
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="card" style={{ marginTop: 14, padding: '12px 13px', borderColor: 'rgba(255,196,107,0.35)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Avatar person={top.wingman} size={34} />
              <div style={{ minWidth: 0 }}>
                <div className="row-title" style={{ fontSize: 14.5 }}>
                  {top.wingman.name} thinks you should match with {top.target.name}
                </div>
                <div className="tiny muted">{timeAgo(top.suggestion.at)}</div>
              </div>
            </div>
            {top.suggestion.note && (
              <div className="note-quote" style={{ marginTop: 10 }}>
                “{top.suggestion.note}”
              </div>
            )}
          </div>

          <SwipeDeck
            ref={deckRef}
            entries={entries}
            viewer={me}
            onDecide={decide}
            onOpen={(person) => setPreview(person)}
            onOpenCircle={(person) => setPreview(person)}
          />

          <div className="deck-actions">
            <button
              className="round round-pass"
              aria-label="Not for me"
              onClick={() => deckRef.current?.fling('pass')}
            >
              ✕
            </button>
            <button
              className="round round-like"
              aria-label="I'd match with them"
              onClick={() => deckRef.current?.fling('like')}
            >
              ♥
            </button>
          </div>
          <p className="tiny muted center" style={{ marginTop: 10 }}>
            Swipe right and it goes to {top.target.name}. Swipe left and only {top.wingman.name}{' '}
            hears about it.
          </p>
        </>
      )}

      {decided.length > 0 && (
        <>
          <div className="section-label">Already answered</div>
          <div className="stack">
            {decided.slice(0, 8).map(({ suggestion, target, wingman }) => (
              <div className="row" key={suggestion.id} style={{ cursor: 'default', opacity: 0.7 }}>
                <Avatar person={target} size={38} />
                <div className="row-main">
                  <div className="row-title" style={{ fontSize: 14 }}>
                    {target.name}
                  </div>
                  <div className="row-sub">
                    From {wingman.name} · {timeAgo(suggestion.respondedAt ?? suggestion.at)}
                  </div>
                </div>
                <span className={`chip tiny ${suggestion.status === 'accepted' ? 'chip-mint' : ''}`}>
                  {suggestion.status === 'accepted' ? 'You said yes' : 'Passed'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <Sheet open={!!preview} onClose={() => setPreview(null)} labelledBy="profile-sheet-title">
        {preview && (
          <>
            <ProfileDetail person={preview} viewer={me} />
            <div className="sheet-actions">
              <div style={{ display: 'flex', gap: 9 }}>
                <button className="btn btn-ghost" onClick={() => decide(preview, 'pass')}>
                  ✕ Not for me
                </button>
                <button className="btn btn-primary btn-block" onClick={() => decide(preview, 'like')}>
                  ♥ I'd match with them
                </button>
              </div>
            </div>
          </>
        )}
      </Sheet>
    </div>
  )
}
