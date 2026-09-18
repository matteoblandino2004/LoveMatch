import {
  forwardRef, useCallback, useImperativeHandle, useRef, useState, type PointerEvent,
} from 'react'
import type { Person, SwipeDirection } from '../types'
import type { DeckEntry } from '../lib/matchmaking'
import { PhotoBackdrop } from './Avatar'
import { scoreLabel, sharedInterests } from '../lib/compatibility'
import { distanceBetween } from '../lib/geo'

export interface DeckHandle {
  fling: (direction: SwipeDirection) => void
}

interface Props {
  entries: DeckEntry[]
  viewer: Person
  onDecide: (person: Person, direction: SwipeDirection) => void
  onOpen: (person: Person) => void
}

const THRESHOLD = 105

export const SwipeDeck = forwardRef<DeckHandle, Props>(function SwipeDeck(
  { entries, viewer, onDecide, onOpen },
  ref,
) {
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false })
  const [exit, setExit] = useState<SwipeDirection | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const moved = useRef(false)
  const busy = useRef(false)

  const top = entries[0]

  const commit = useCallback(
    (direction: SwipeDirection, person: Person) => {
      if (busy.current) return
      busy.current = true
      setExit(direction)
      setDrag({ x: direction === 'like' ? 520 : -520, y: -40, active: false })
      window.setTimeout(() => {
        onDecide(person, direction)
        setDrag({ x: 0, y: 0, active: false })
        setExit(null)
        busy.current = false
      }, 260)
    },
    [onDecide],
  )

  useImperativeHandle(ref, () => ({
    fling: (direction) => {
      if (top) commit(direction, top.person)
    },
  }))

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!top || exit) return
    start.current = { x: e.clientX, y: e.clientY }
    moved.current = false
    setDrag({ x: 0, y: 0, active: true })
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!start.current || exit) return
    const x = e.clientX - start.current.x
    const y = e.clientY - start.current.y
    if (Math.abs(x) > 6 || Math.abs(y) > 6) moved.current = true
    setDrag({ x, y, active: true })
  }

  function onPointerUp() {
    if (!start.current || !top) return
    const { x } = drag
    start.current = null
    if (Math.abs(x) > THRESHOLD) {
      commit(x > 0 ? 'like' : 'pass', top.person)
    } else {
      setDrag({ x: 0, y: 0, active: false })
      if (!moved.current) onOpen(top.person)
    }
  }

  if (!top) return null

  const rotation = drag.x / 17
  const likeOpacity = Math.min(1, Math.max(0, drag.x / THRESHOLD))
  const nopeOpacity = Math.min(1, Math.max(0, -drag.x / THRESHOLD))

  return (
    <div className="deck">
      {entries
        .slice(0, 3)
        .map((entry, i) => {
          const isTop = i === 0
          const style: React.CSSProperties = isTop
            ? {
                transform: `translate(${drag.x}px, ${drag.y}px) rotate(${rotation}deg)`,
                opacity: exit ? 0 : 1,
                zIndex: 3,
              }
            : {
                transform: `translateY(${i * 12}px) scale(${1 - i * 0.045})`,
                zIndex: 3 - i,
                opacity: 1 - i * 0.25,
                filter: 'saturate(0.85)',
              }
          return (
            <div
              key={entry.person.id}
              className={`deck-card ${isTop && drag.active ? 'dragging' : 'settling'}`}
              style={style}
            >
              <PhotoBackdrop person={entry.person} />
              <div className="deck-scrim" />
              <div
                className="deck-card-inner"
                onPointerDown={isTop ? onPointerDown : undefined}
                onPointerMove={isTop ? onPointerMove : undefined}
                onPointerUp={isTop ? onPointerUp : undefined}
                onPointerCancel={isTop ? onPointerUp : undefined}
              >
                <div className="score-badge">
                  <b>{entry.score}</b>
                  <small>{scoreLabel(entry.score)}</small>
                </div>
                {isTop && (
                  <>
                    <div className="stamp stamp-like" style={{ opacity: likeOpacity }}>
                      LIKE
                    </div>
                    <div className="stamp stamp-nope" style={{ opacity: nopeOpacity }}>
                      NOPE
                    </div>
                  </>
                )}
                <CardBody person={entry.person} viewer={viewer} />
              </div>
            </div>
          )
        })
        .reverse()}
    </div>
  )
})

function CardBody({ person, viewer }: { person: Person; viewer: Person }) {
  const km = distanceBetween(viewer.city, person.city)
  const shared = sharedInterests(viewer, person).slice(0, 3)
  return (
    <div className="deck-body">
      <div className="deck-name">
        {person.name} <span>{person.age}</span>
      </div>
      <div className="deck-meta">
        {person.job || person.education}
        {person.job && ' · '}
        {person.city}
        {km !== null && km > 0 ? ` · ${km} km away` : ''}
      </div>
      <div className="deck-bio">{person.bio}</div>
      {shared.length > 0 && (
        <div className="chip-row" style={{ marginTop: 11 }}>
          {shared.map((s) => (
            <span className="chip chip-mint" key={s}>
              ✦ {s}
            </span>
          ))}
        </div>
      )}
      <div className="tiny muted" style={{ marginTop: 10 }}>
        Tap for the full profile and score breakdown
      </div>
    </div>
  )
}
