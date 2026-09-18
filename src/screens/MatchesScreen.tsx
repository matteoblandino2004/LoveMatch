import { useMemo, useState } from 'react'
import type { Match } from '../types'
import { useApp } from '../state/store'
import { Avatar } from '../components/Avatar'
import { Sheet } from '../components/Sheet'
import { ProfileDetail } from '../components/ProfileDetail'
import { compatibility, scoreLabel } from '../lib/compatibility'
import { timeAgo } from '../lib/time'

export function MatchesScreen({ onGoSwipe }: { onGoSwipe: () => void }) {
  const { state, archiveMatch } = useApp()
  const [open, setOpen] = useState<Match | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [intro, setIntro] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const visible = useMemo(
    () => state.matches.filter((m) => m.archived === showArchived),
    [state.matches, showArchived],
  )

  const grouped = useMemo(() => {
    const map = new Map<string, Match[]>()
    for (const m of visible) {
      const list = map.get(m.profileId) ?? []
      list.push(m)
      map.set(m.profileId, list)
    }
    return [...map.entries()]
  }, [visible])

  const openProfile = open ? state.people[open.profileId] : null
  const openTarget = open ? state.people[open.targetId] : null

  return (
    <div className="screen">
      <h1 className="screen-title">Matches</h1>
      <p className="screen-sub">Both sides swiped right. Now somebody has to text first.</p>

      <div className="pill-tab" style={{ marginTop: 14 }}>
        <button className={!showArchived ? 'on' : ''} onClick={() => setShowArchived(false)}>
          Active
        </button>
        <button className={showArchived ? 'on' : ''} onClick={() => setShowArchived(true)}>
          Archived
        </button>
      </div>

      {grouped.length === 0 ? (
        <div className="empty" style={{ marginTop: 22 }}>
          <span className="emoji">{showArchived ? '🗄️' : '💌'}</span>
          <b>{showArchived ? 'Nothing archived' : 'No matches yet'}</b>
          {!showArchived && (
            <>
              <p className="tiny" style={{ marginTop: 6 }}>
                Keep swiping. Some people take a minute to swipe back.
              </p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onGoSwipe}>
                Back to swiping
              </button>
            </>
          )}
        </div>
      ) : (
        grouped.map(([profileId, matches]) => {
          const profile = state.people[profileId]
          if (!profile) return null
          return (
            <div key={profileId}>
              <div className="section-label">
                For {profile.managed?.kind === 'self' ? 'you' : profile.name} · {matches.length}
              </div>
              {matches.map((m) => {
                const target = state.people[m.targetId]
                if (!target) return null
                return (
                  <button className="row" key={m.id} onClick={() => setOpen(m)}>
                    <Avatar person={target} size={46} />
                    <div className="row-main">
                      <div className="row-title">
                        {target.name}, {target.age}
                        <span className="chip chip-hot tiny">{m.score}%</span>
                      </div>
                      <div className="row-sub">
                        {m.byMatchmaker ? '★ You picked this one · ' : ''}
                        {target.city} · {timeAgo(m.at)}
                      </div>
                    </div>
                    <span className="muted">›</span>
                  </button>
                )
              })}
            </div>
          )
        })
      )}

      <Sheet open={!!open} onClose={() => setOpen(null)} labelledBy="profile-sheet-title">
        {open && openProfile && openTarget && (
          <>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="between">
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <Avatar person={openProfile} size={38} />
                  <span style={{ fontSize: 17 }}>💘</span>
                  <Avatar person={openTarget} size={38} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <b style={{ fontSize: 18 }}>{open.score}%</b>
                  <div className="tiny muted">{scoreLabel(open.score)}</div>
                </div>
              </div>
              <p className="tiny muted" style={{ marginTop: 10 }}>
                {openProfile.name} and {openTarget.name} matched {timeAgo(open.at)}
                {open.byMatchmaker ? ' — from a profile you picked for them.' : '.'}
              </p>
              {open.note && (
                <div className="note-quote" style={{ marginTop: 10 }}>
                  Your note: “{open.note}”
                </div>
              )}
            </div>

            <ProfileDetail person={openTarget} viewer={openProfile} />

            <div className="sheet-actions">
              <div style={{ display: 'flex', gap: 9 }}>
                {!open.archived && (
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      archiveMatch(open.id)
                      setOpen(null)
                    }}
                  >
                    Archive
                  </button>
                )}
                <button
                  className="btn btn-primary btn-block"
                  onClick={() => {
                    setCopied(false)
                    setIntro(buildIntro(openProfile.name, openTarget.name, open.score, compatibility(openProfile, openTarget)))
                  }}
                >
                  Write the intro
                </button>
              </div>
            </div>
          </>
        )}
      </Sheet>

      <Sheet open={!!intro} onClose={() => setIntro(null)}>
        {intro && (
          <>
            <h2 style={{ fontSize: 20 }}>The text you were going to overthink</h2>
            <p className="tiny muted" style={{ marginTop: 6 }}>
              Built from what they actually have in common. Edit it, send it, take the credit.
            </p>
            <div className="card" style={{ marginTop: 14, whiteSpace: 'pre-wrap' }}>{intro}</div>
            <div className="sheet-actions">
              <button
                className="btn btn-primary btn-block"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(intro)
                    setCopied(true)
                  } catch {
                    setCopied(false)
                  }
                }}
              >
                {copied ? '✓ Copied' : 'Copy to clipboard'}
              </button>
            </div>
          </>
        )}
      </Sheet>
    </div>
  )
}

function buildIntro(
  profileName: string,
  targetName: string,
  score: number,
  compat: ReturnType<typeof compatibility>,
): string {
  const shared = compat.shared.slice(0, 3).join(', ')
  const lines = [
    `${profileName} — you matched with ${targetName}.`,
    '',
    `The app puts you two at ${score}% (${scoreLabel(score).toLowerCase()}).`,
    shared ? `You're both into ${shared}.` : 'Not much overlap on paper, which is sometimes the fun part.',
    '',
    compat.icebreakers[0],
  ]
  return lines.join('\n')
}
