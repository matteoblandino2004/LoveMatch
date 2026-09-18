import { useEffect, useRef, useState } from 'react'
import type { Invite, Match, Occasion, Person } from './types'
import { AppProvider, useApp, useUnreadCount } from './state/store'
import { Onboarding } from './screens/Onboarding'
import { SwipeScreen } from './screens/SwipeScreen'
import { RosterScreen } from './screens/RosterScreen'
import { EventsScreen } from './screens/EventsScreen'
import { MatchesScreen } from './screens/MatchesScreen'
import { NotificationsScreen } from './screens/NotificationsScreen'
import { ProfileEditor } from './screens/ProfileEditor'
import { OccasionEditor } from './screens/OccasionEditor'
import { Sheet } from './components/Sheet'
import { Avatar } from './components/Avatar'
import { Confetti } from './components/Confetti'
import { blankPerson, displayRelationship } from './lib/people'
import { haptic, initNative } from './lib/native'
import { scoreLabel } from './lib/compatibility'
import { OCCASION_KINDS, blankOccasion, companionLine, whenLabel } from './lib/occasions'

type Tab = 'swipe' | 'roster' | 'events' | 'matches' | 'activity'

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'swipe', icon: '🔥', label: 'Swipe' },
  { id: 'roster', icon: '🧑‍🤝‍🧑', label: 'People' },
  { id: 'events', icon: '🗓️', label: 'Occasions' },
  { id: 'matches', icon: '💘', label: 'Matches' },
  { id: 'activity', icon: '🔔', label: 'Activity' },
]

/** What the full-screen celebration is celebrating. */
type Celebration =
  | { kind: 'match'; match: Match }
  | { kind: 'date'; invite: Invite; occasion: Occasion | undefined }

function Shell() {
  const {
    state, saveProfile, removeProfile, setActiveProfile, saveOccasion, removeOccasion,
    loadSampleRoster, resetEverything,
  } = useApp()
  const [tab, setTab] = useState<Tab>('swipe')
  const [editing, setEditing] = useState<Person | null>(null)
  const [editingOccasion, setEditingOccasion] = useState<Occasion | null>(null)
  const [occasionId, setOccasionId] = useState<string | null>(null)
  const [settings, setSettings] = useState(false)
  const [celebrating, setCelebrating] = useState<Celebration | null>(null)
  const unread = useUnreadCount()

  // Only celebrate things that land while you're here, not on every reload.
  const lastMatchId = useRef<string | null>(state.matches[0]?.id ?? null)
  const lastDateId = useRef<string | null>(
    state.invites.find((i) => i.status === 'accepted')?.id ?? null,
  )

  useEffect(() => {
    const newest = state.matches[0]
    if (newest && newest.id !== lastMatchId.current) {
      lastMatchId.current = newest.id
      setCelebrating({ kind: 'match', match: newest })
      haptic('match')
    }
  }, [state.matches])

  useEffect(() => {
    const accepted = state.invites.find((i) => i.status === 'accepted')
    if (accepted && accepted.id !== lastDateId.current) {
      lastDateId.current = accepted.id
      setCelebrating({
        kind: 'date',
        invite: accepted,
        occasion: state.occasions.find((o) => o.id === accepted.occasionId),
      })
      haptic('match')
    }
  }, [state.invites, state.occasions])

  const roster = state.rosterIds.map((id) => state.people[id]).filter(Boolean)

  function newOccasionFor(profileId?: string) {
    const target = profileId ?? state.activeProfileId ?? state.rosterIds[0]
    if (!target) return
    setEditingOccasion(blankOccasion(target, state.people[target]?.city ?? ''))
  }

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

  return (
    <div className="app">
      <header className="topbar">
        <div className="wordmark">LoveMatch</div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm" onClick={() => setSettings(true)}>
          {state.account.name} ⚙︎
        </button>
      </header>

      {tab === 'swipe' && (
        <SwipeScreen
          onAddProfile={() => setEditing(blankPerson('other'))}
          occasionId={occasionId}
          onSelectOccasion={setOccasionId}
          onCreateOccasion={() => newOccasionFor()}
        />
      )}
      {tab === 'roster' && (
        <RosterScreen
          onAdd={(kind) => setEditing(blankPerson(kind))}
          onEdit={(person) => setEditing(person)}
          onSwipeFor={(id) => {
            setActiveProfile(id)
            setOccasionId(null)
            setTab('swipe')
          }}
          onAddOccasion={(id) => newOccasionFor(id)}
        />
      )}
      {tab === 'events' && (
        <EventsScreen
          onCreate={() => newOccasionFor()}
          onEdit={(occasion) => setEditingOccasion(occasion)}
          onFill={(occasion) => {
            setActiveProfile(occasion.profileId)
            setOccasionId(occasion.id)
            setTab('swipe')
          }}
          onAddProfile={() => setEditing(blankPerson('other'))}
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

      <Sheet open={!!editingOccasion} onClose={() => setEditingOccasion(null)}>
        {editingOccasion && (
          <OccasionEditor
            key={editingOccasion.id}
            initial={editingOccasion}
            roster={roster}
            onCancel={() => setEditingOccasion(null)}
            onSave={(occasion) => {
              saveOccasion(occasion)
              setEditingOccasion(null)
              setTab('events')
            }}
            onDelete={
              state.occasions.some((o) => o.id === editingOccasion.id)
                ? () => {
                    removeOccasion(editingOccasion.id)
                    if (occasionId === editingOccasion.id) setOccasionId(null)
                    setEditingOccasion(null)
                  }
                : undefined
            }
          />
        )}
      </Sheet>

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

      {celebrating && (
        <CelebrationOverlay
          celebration={celebrating}
          onClose={() => setCelebrating(null)}
          onSeeMore={() => {
            setTab(celebrating.kind === 'match' ? 'matches' : 'events')
            setCelebrating(null)
          }}
        />
      )}
    </div>
  )
}

function CelebrationOverlay({
  celebration, onClose, onSeeMore,
}: {
  celebration: Celebration
  onClose: () => void
  onSeeMore: () => void
}) {
  const { state } = useApp()
  const profileId = celebration.kind === 'match' ? celebration.match.profileId : celebration.invite.profileId
  const targetId = celebration.kind === 'match' ? celebration.match.targetId : celebration.invite.targetId
  const profile = state.people[profileId]
  const target = state.people[targetId]
  if (!profile || !target) return null

  const isDate = celebration.kind === 'date'
  const occasion = isDate ? celebration.occasion : undefined
  const score = celebration.kind === 'match' ? celebration.match.score : celebration.invite.score

  return (
    <>
      <Confetti />
      <div className="celebrate" role="dialog" aria-modal="true" onClick={onClose}>
        <div className="celebrate-title">{isDate ? "You've got a date!" : "It's a match!"}</div>
        <div className="celebrate-pair">
          <Avatar person={profile} size={82} />
          <span className="celebrate-heart">{isDate ? '🥂' : '💘'}</span>
          <Avatar person={target} size={82} />
        </div>
        <h2 style={{ fontSize: 21, marginTop: 8 }}>
          {profile.name} &amp; {target.name}
        </h2>

        {isDate && occasion ? (
          <>
            <p className="muted" style={{ marginTop: 8, maxWidth: 330 }}>
              {target.name} said yes to {OCCASION_KINDS[occasion.kind].emoji} {occasion.title} —{' '}
              {whenLabel(occasion.date)} in {occasion.city}.
            </p>
            {companionLine(occasion) && (
              <p className="tiny muted" style={{ marginTop: 6 }}>
                {companionLine(occasion)}
              </p>
            )}
            {celebration.invite.reply && (
              <div className="note-quote" style={{ marginTop: 14, maxWidth: 340 }}>
                {target.name}: “{celebration.invite.reply}”
              </div>
            )}
          </>
        ) : (
          <p className="muted" style={{ marginTop: 8, maxWidth: 320 }}>
            {celebration.kind === 'match' && celebration.match.byMatchmaker
              ? `${target.name} liked the profile you picked for ${profile.name} (${displayRelationship(profile).toLowerCase()}). ${profile.name} has been notified.`
              : `You and ${target.name} both swiped right.`}
          </p>
        )}

        <div className="chip chip-hot" style={{ marginTop: 14 }}>
          {score}% · {isDate ? `${celebration.invite.fit}% for this one` : scoreLabel(score)}
        </div>

        {celebration.kind === 'match' && celebration.match.note && (
          <div className="note-quote" style={{ marginTop: 14, maxWidth: 340 }}>
            Your note went with it: “{celebration.match.note}”
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 26 }}>
          <button
            className="btn btn-ghost"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
          >
            Keep swiping
          </button>
          <button
            className="btn btn-primary"
            onClick={(e) => {
              e.stopPropagation()
              onSeeMore()
            }}
          >
            {isDate ? 'See the plan' : 'See the match'}
          </button>
        </div>
      </div>
    </>
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
