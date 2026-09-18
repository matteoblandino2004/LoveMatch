import { useEffect } from 'react'
import { useApp } from '../state/store'
import { Avatar } from '../components/Avatar'
import { timeAgo } from '../lib/time'
import type { NotificationKind } from '../types'

const ICONS: Record<NotificationKind, string> = {
  match: '💘',
  'matchmaker-swipe': '★',
  'profile-added': '🧑‍🤝‍🧑',
  occasion: '🗓️',
  invite: '✉️',
  'invite-accepted': '🥂',
  'invite-declined': '🙇',
  tip: '💡',
}

export function NotificationsScreen({ onOpenMatches }: { onOpenMatches: () => void }) {
  const { state, markNotificationsRead } = useApp()

  // Opening the tab is the read receipt.
  useEffect(() => {
    const timer = window.setTimeout(markNotificationsRead, 900)
    return () => window.clearTimeout(timer)
  }, [markNotificationsRead])

  return (
    <div className="screen">
      <h1 className="screen-title">Activity</h1>
      <p className="screen-sub">Matches, and every pick your matchmakers send your way.</p>

      {state.notifications.length === 0 ? (
        <div className="empty" style={{ marginTop: 24 }}>
          <span className="emoji">🔔</span>
          <b>Nothing yet</b>
          <p className="tiny" style={{ marginTop: 6 }}>
            Swipe for someone and this fills up fast.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 16 }}>
          {state.notifications.map((n) => {
            const profile = n.profileId ? state.people[n.profileId] : null
            return (
              <button
                key={n.id}
                className={`row ${n.read ? '' : 'row-unread'}`}
                onClick={n.kind === 'match' ? onOpenMatches : undefined}
                style={{ cursor: n.kind === 'match' ? 'pointer' : 'default' }}
              >
                {profile ? (
                  <div style={{ position: 'relative' }}>
                    <Avatar person={profile} size={42} />
                    <span
                      style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -4,
                        fontSize: 14,
                        background: '#170c19',
                        borderRadius: 999,
                        padding: '1px 3px',
                      }}
                    >
                      {ICONS[n.kind]}
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: 22 }}>{ICONS[n.kind]}</div>
                )}
                <div className="row-main">
                  <div className="row-title" style={{ fontSize: 14.5 }}>
                    {n.title}
                  </div>
                  <div className="row-sub" style={{ whiteSpace: 'normal' }}>
                    {n.body}
                  </div>
                  <div className="tiny muted" style={{ marginTop: 3 }}>
                    {timeAgo(n.at)}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
