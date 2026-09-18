import { useEffect, useRef, useState } from 'react'
import type { Match, Person } from './types'
import { AppProvider, useApp, useUnreadCount } from './state/store'
import { Onboarding } from './screens/Onboarding'
import { SwipeScreen } from './screens/SwipeScreen'
import { RosterScreen } from './screens/RosterScreen'
import { MatchesScreen } from './screens/MatchesScreen'
import { NotificationsScreen } from './screens/NotificationsScreen'
import { ProfileEditor } from './screens/ProfileEditor'
import { Sheet } from './components/Sheet'
import { Avatar } from './components/Avatar'
import { Confetti } from './components/Confetti'
import { blankPerson, displayRelationship } from './lib/people'
import { haptic, initNative } from './lib/native'
import { scoreLabel } from './lib/compatibility'

type Tab = 'swipe' | 'roster' | 'matches' | 'activity'

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'swipe', icon: '🔥', label: 'Swipe' },
  { id: 'roster', icon: '🧑‍🤝‍🧑', label: 'My people' },
  { id: 'matches', icon: '💘', label: 'Matches' },
  { id: 'activity', icon: '🔔', label: 'Activity' },
]

function Shell() {
  const { state, saveProfile, removeProfile, setActiveProfile, loadSampleRoster, resetEverything } = useApp()
  const [tab, setTab] = useState<Tab>('swipe')
  const [editing, setEditing] = useState<Person | null>(null)
  const [settings, setSettings] = useState(false)
  const [celebrating, setCelebrating] = useState<Match | null>(null)
  const unread = useUnreadCount()

  // Only celebrate matches that land while you're here, not on every reload.
  const lastMatchId = useRef<string | null>(state.matches[0]?.id ?? null)
  useEffect(() => {
    const newest = state.matches[0]
    if (newest && newest.id !== lastMatchId.current) {
      lastMatchId.current = newest.id
      setCelebrating(newest)
      haptic('match')
    }
  }, [state.matches])

  if (!state.account) {
    return (
      <div className="app">
        <Onboarding onCreateProfile={(kind) => setEditing(blankPerson(kind))} />
        <EditorSheet
          editing={editing}
          onClose={() => setEditing(null)}
          onSave={(person) => {
            saveProfile(person)
            setEditing(null)
          }}
        />
      </div>
    )
  }

  const celebrationProfile = celebrating ? state.people[celebrating.profileId] : null
  const celebrationTarget = celebrating ? state.people[celebrating.targetId] : null

  return (
    <div className="app">
      <header className="topbar">
        <div className="wordmark">LoveMatch</div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm" onClick={() => setSettings(true)}>
          {state.account.name} ⚙︎
        </button>
      </header>

      {tab === 'swipe' && <SwipeScreen onAddProfile={() => setEditing(blankPerson('other'))} />}
      {tab === 'roster' && (
        <RosterScreen
          onAdd={(kind) => setEditing(blankPerson(kind))}
          onEdit={(person) => setEditing(person)}
          onSwipeFor={(id) => {
            setActiveProfile(id)
            setTab('swipe')
          }}
        />
      )}
      {tab === 'matches' && <MatchesScreen onGoSwipe={() => setTab('swipe')} />}
      {tab === 'activity' && <NotificationsScreen onOpenMatches={() => setTab('matches')} />}

      <nav className="nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id}
          >
            <span className="nav-icon">{t.icon}</span>
            {t.label}
            {t.id === 'activity' && unread > 0 && <span className="badge">{unread}</span>}
          </button>
        ))}
      </nav>

      <EditorSheet
        editing={editing}
        onClose={() => setEditing(null)}
        onSave={(person) => {
          saveProfile(person)
          setEditing(null)
        }}
        onDelete={
          editing && state.rosterIds.includes(editing.id)
            ? () => {
                removeProfile(editing.id)
                setEditing(null)
              }
            : undefined
        }
      />

      <Sheet open={settings} onClose={() => setSettings(false)}>
        <h2 style={{ fontSize: 20 }}>Settings</h2>
        <p className="tiny muted" style={{ marginTop: 6 }}>
          Signed in as {state.account.name}. Everything lives in this browser — clearing site data
          clears your roster.
        </p>
        <div className="stack" style={{ marginTop: 16 }}>
          <button
            className="btn btn-ghost btn-block"
            onClick={() => {
              loadSampleRoster()
              setSettings(false)
            }}
          >
            Load the sample family
          </button>
          <button
            className="btn btn-danger btn-block"
            onClick={() => {
              if (confirm('Delete every profile, match and swipe on this device?')) {
                resetEverything()
                setSettings(false)
              }
            }}
          >
            Reset everything
          </button>
        </div>
        <hr className="hr" />
        <p className="tiny muted">
          A note on manners: make a profile for someone only if they'd be glad you did. The app asks
          you to confirm they said yes, and it's not just a checkbox — it's the whole idea.
        </p>
      </Sheet>

      {celebrating && celebrationProfile && celebrationTarget && (
        <>
          <Confetti />
          <div
            className="celebrate"
            role="dialog"
            aria-modal="true"
            onClick={() => setCelebrating(null)}
          >
            <div className="celebrate-title">It's a match!</div>
            <div className="celebrate-pair">
              <Avatar person={celebrationProfile} size={82} />
              <span className="celebrate-heart">💘</span>
              <Avatar person={celebrationTarget} size={82} />
            </div>
            <h2 style={{ fontSize: 21, marginTop: 8 }}>
              {celebrationProfile.name} &amp; {celebrationTarget.name}
            </h2>
            <p className="muted" style={{ marginTop: 8, maxWidth: 320 }}>
              {celebrating.byMatchmaker
                ? `${celebrationTarget.name} liked the profile you picked for ${celebrationProfile.name} (${displayRelationship(celebrationProfile).toLowerCase()}). ${celebrationProfile.name} has been notified.`
                : `You and ${celebrationTarget.name} both swiped right.`}
            </p>
            <div className="chip chip-hot" style={{ marginTop: 14 }}>
              {celebrating.score}% · {scoreLabel(celebrating.score)}
            </div>
            {celebrating.note && (
              <div className="note-quote" style={{ marginTop: 14, maxWidth: 340 }}>
                Your note went with it: “{celebrating.note}”
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 26 }}>
              <button
                className="btn btn-ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  setCelebrating(null)
                }}
              >
                Keep swiping
              </button>
              <button
                className="btn btn-primary"
                onClick={(e) => {
                  e.stopPropagation()
                  setCelebrating(null)
                  setTab('matches')
                }}
              >
                See the match
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function EditorSheet({
  editing, onClose, onSave, onDelete,
}: {
  editing: Person | null
  onClose: () => void
  onSave: (person: Person) => void
  onDelete?: () => void
}) {
  return (
    <Sheet open={!!editing} onClose={onClose}>
      {editing && (
        <ProfileEditor
          key={editing.id}
          initial={editing}
          onSave={onSave}
          onCancel={onClose}
          onDelete={onDelete}
        />
      )}
    </Sheet>
  )
}

export default function App() {
  useEffect(() => {
    void initNative()
  }, [])
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
