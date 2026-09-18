import {
  createContext, useContext, useEffect, useMemo, useReducer, useRef,
  type ReactNode,
} from 'react'
import type { AppNotification, AppState, Match, Person, SwipeDirection } from '../types'
import { clearState, emptyState, loadState, saveState } from '../lib/storage'
import { clearAllPhotos, deletePhotos } from '../lib/photos'
import { decideReciprocal } from '../lib/matchmaking'
import { uid } from '../lib/id'
import { SAMPLE_ROSTER } from '../lib/seed'
import { displayRelationship } from '../lib/people'

type Action =
  | { type: 'account/create'; name: string }
  | { type: 'profile/save'; person: Person }
  | { type: 'profile/remove'; id: string }
  | { type: 'profile/setActive'; id: string }
  | {
      type: 'swipe'
      profileId: string
      targetId: string
      direction: SwipeDirection
      byMatchmaker: boolean
      note?: string
      score: number
    }
  | { type: 'swipe/undo'; profileId: string }
  | { type: 'pending/resolve'; now: number }
  | { type: 'notifications/readAll' }
  | { type: 'match/archive'; id: string }
  | { type: 'seed/sample' }
  | { type: 'reset' }

function notify(
  state: AppState,
  n: Omit<AppNotification, 'id' | 'at' | 'read'>,
): AppNotification[] {
  const entry: AppNotification = { id: uid('n_'), at: Date.now(), read: false, ...n }
  return [entry, ...state.notifications].slice(0, 120)
}

function nameOf(state: AppState, id: string): string {
  return state.people[id]?.name ?? 'Someone'
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'account/create':
      return { ...state, account: { name: action.name, createdAt: Date.now() } }

    case 'profile/save': {
      const exists = state.rosterIds.includes(action.person.id)
      const next: AppState = {
        ...state,
        people: { ...state.people, [action.person.id]: action.person },
        rosterIds: exists ? state.rosterIds : [...state.rosterIds, action.person.id],
        activeProfileId: state.activeProfileId ?? action.person.id,
      }
      if (exists) return next
      const who = displayRelationship(action.person)
      return {
        ...next,
        notifications: notify(next, {
          kind: 'profile-added',
          title: `${action.person.name} is on your roster`,
          body:
            action.person.managed?.kind === 'self'
              ? "Your own profile is live. You can swipe for yourself and let your people swipe for you."
              : `You're now matchmaking for ${action.person.name} (${who.toLowerCase()}). Start swiping on their behalf.`,
          profileId: action.person.id,
        }),
      }
    }

    case 'profile/remove': {
      const people = { ...state.people }
      // The profile's photos are bytes in IndexedDB — take them with it.
      void deletePhotos(people[action.id]?.photos ?? [])
      delete people[action.id]
      const rosterIds = state.rosterIds.filter((id) => id !== action.id)
      return {
        ...state,
        people,
        rosterIds,
        activeProfileId: state.activeProfileId === action.id ? rosterIds[0] ?? null : state.activeProfileId,
        swipes: state.swipes.filter((s) => s.profileId !== action.id),
        pending: state.pending.filter((p) => p.profileId !== action.id),
        matches: state.matches.filter((m) => m.profileId !== action.id),
        notifications: state.notifications.filter((n) => n.profileId !== action.id),
      }
    }

    case 'profile/setActive':
      return { ...state, activeProfileId: action.id }

    case 'swipe': {
      const swipeId = uid('s_')
      const swipe = {
        id: swipeId,
        profileId: action.profileId,
        targetId: action.targetId,
        direction: action.direction,
        byMatchmaker: action.byMatchmaker,
        note: action.note,
        score: action.score,
        at: Date.now(),
      }
      let next: AppState = { ...state, swipes: [...state.swipes, swipe] }
      if (action.direction === 'pass') return next

      const profileName = nameOf(state, action.profileId)
      const targetName = nameOf(state, action.targetId)

      if (action.byMatchmaker) {
        next = {
          ...next,
          notifications: notify(next, {
            kind: 'matchmaker-swipe',
            title: `Sent to ${profileName}`,
            body: `You picked ${targetName} for ${profileName}${action.note ? ` — "${action.note}"` : ''}.`,
            profileId: action.profileId,
          }),
        }
      }

      const { willMatch, delayMs } = decideReciprocal(action.profileId, action.targetId, action.score)
      if (!willMatch) return next

      if (delayMs === 0) return applyMatch(next, swipe)

      return {
        ...next,
        pending: [
          ...next.pending,
          {
            swipeId,
            profileId: action.profileId,
            targetId: action.targetId,
            score: action.score,
            byMatchmaker: action.byMatchmaker,
            note: action.note,
            revealAt: Date.now() + delayMs,
            willMatch: true,
          },
        ],
      }
    }

    case 'swipe/undo': {
      const last = [...state.swipes].reverse().find((s) => s.profileId === action.profileId)
      if (!last) return state
      return {
        ...state,
        swipes: state.swipes.filter((s) => s.id !== last.id),
        pending: state.pending.filter((p) => p.swipeId !== last.id),
        matches: state.matches.filter(
          (m) => !(m.profileId === last.profileId && m.targetId === last.targetId),
        ),
      }
    }

    case 'pending/resolve': {
      const due = state.pending.filter((p) => p.revealAt <= action.now)
      if (!due.length) return state
      let next: AppState = {
        ...state,
        pending: state.pending.filter((p) => p.revealAt > action.now),
      }
      for (const p of due) {
        if (!p.willMatch) continue
        next = applyMatch(next, p)
      }
      return next
    }

    case 'notifications/readAll':
      return { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) }

    case 'match/archive':
      return {
        ...state,
        matches: state.matches.map((m) => (m.id === action.id ? { ...m, archived: true } : m)),
      }

    case 'seed/sample': {
      const people = { ...state.people }
      const rosterIds = [...state.rosterIds]
      for (const person of SAMPLE_ROSTER) {
        if (people[person.id] && rosterIds.includes(person.id)) continue
        people[person.id] = person
        rosterIds.push(person.id)
      }
      return {
        ...state,
        people,
        rosterIds,
        activeProfileId: state.activeProfileId ?? rosterIds[0] ?? null,
      }
    }

    case 'reset':
      return emptyState()

    default:
      return state
  }
}

type MatchSource = {
  profileId: string
  targetId: string
  score: number
  byMatchmaker: boolean
  note?: string
}

function applyMatch(state: AppState, source: MatchSource): AppState {
  const already = state.matches.some(
    (m) => m.profileId === source.profileId && m.targetId === source.targetId,
  )
  if (already) return state

  const match: Match = {
    id: uid('m_'),
    profileId: source.profileId,
    targetId: source.targetId,
    score: source.score,
    byMatchmaker: source.byMatchmaker,
    note: source.note,
    at: Date.now(),
    archived: false,
  }
  const profile = state.people[source.profileId]
  const target = state.people[source.targetId]
  const withMatch = { ...state, matches: [match, ...state.matches] }
  return {
    ...withMatch,
    notifications: notify(withMatch, {
      kind: 'match',
      title: `It's a match — ${profile?.name ?? 'Someone'} & ${target?.name ?? 'someone'}`,
      body: source.byMatchmaker
        ? `${target?.name ?? 'They'} liked the profile you picked for ${profile?.name ?? 'them'}. ${source.score}% compatible.`
        : `You and ${target?.name ?? 'they'} both swiped right. ${source.score}% compatible.`,
      profileId: source.profileId,
      matchId: match.id,
    }),
  }
}

interface Store {
  state: AppState
  createAccount: (name: string) => void
  saveProfile: (person: Person) => void
  removeProfile: (id: string) => void
  setActiveProfile: (id: string) => void
  swipe: (args: {
    profileId: string
    targetId: string
    direction: SwipeDirection
    byMatchmaker: boolean
    note?: string
    score: number
  }) => void
  undoSwipe: (profileId: string) => void
  markNotificationsRead: () => void
  archiveMatch: (id: string) => void
  loadSampleRoster: () => void
  resetEverything: () => void
}

const StoreContext = createContext<Store | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    saveState(state)
  }, [state])

  // Replies don't arrive the instant you swipe — let the pending ones land.
  useEffect(() => {
    const tick = () => dispatch({ type: 'pending/resolve', now: Date.now() })
    tick()
    const timer = window.setInterval(tick, 4000)
    const onFocus = () => tick()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const value = useMemo<Store>(
    () => ({
      state,
      createAccount: (name) => dispatch({ type: 'account/create', name }),
      saveProfile: (person) => dispatch({ type: 'profile/save', person }),
      removeProfile: (id) => dispatch({ type: 'profile/remove', id }),
      setActiveProfile: (id) => dispatch({ type: 'profile/setActive', id }),
      swipe: (args) => dispatch({ type: 'swipe', ...args }),
      undoSwipe: (profileId) => dispatch({ type: 'swipe/undo', profileId }),
      markNotificationsRead: () => dispatch({ type: 'notifications/readAll' }),
      archiveMatch: (id) => dispatch({ type: 'match/archive', id }),
      loadSampleRoster: () => dispatch({ type: 'seed/sample' }),
      resetEverything: () => {
        clearState()
        void clearAllPhotos()
        dispatch({ type: 'reset' })
      },
    }),
    [state],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useApp(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useApp must be used inside <AppProvider>')
  return store
}

/** Convenience: the roster profile currently being swiped for. */
export function useActiveProfile(): Person | null {
  const { state } = useApp()
  const id = state.activeProfileId
  return id ? state.people[id] ?? null : null
}

export const _internal = { reducer, applyMatch }

export function useUnreadCount(): number {
  const { state } = useApp()
  return useMemo(
    () => state.notifications.filter((n) => !n.read).length,
    [state.notifications],
  )
}
