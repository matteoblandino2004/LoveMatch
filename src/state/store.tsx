import {
  createContext, useContext, useEffect, useMemo, useReducer, useRef,
  type ReactNode,
} from 'react'
import type {
  AppNotification, AppState, Connection, GrantStatus, Invite, InviteStatus, Match, Occasion,
  Person, SwipeDirection, Tie, WingmanGrant,
} from '../types'
import { clearState, emptyState, loadState, saveState } from '../lib/storage'
import { clearAllPhotos, deletePhotos } from '../lib/photos'
import { decideReciprocal } from '../lib/matchmaking'
import { OCCASION_KINDS, decideInvite, whenLabel } from '../lib/occasions'
import { uid } from '../lib/id'
import { SAMPLE_CONNECTIONS, SAMPLE_OCCASIONS, SAMPLE_ROSTER } from '../lib/seed'
import { displayRelationship } from '../lib/people'
import { involves, makeConnection } from '../lib/connections'
import { canSwipeFor, decideRequest, grantBetween, isOnDevice } from '../lib/accounts'

type Action =
  | { type: 'account/create'; person: Person }
  | { type: 'account/switch'; id: string }
  | { type: 'grant/request'; ownerId: string; wingmanId: string; message?: string }
  | { type: 'grant/respond'; id: string; status: Extract<GrantStatus, 'approved' | 'declined'> }
  | { type: 'grant/revoke'; id: string }
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
  | {
      /** Record a swipe with no like semantics — used when an invitation is the action. */
      type: 'swipe/record'
      profileId: string
      targetId: string
      score: number
    }
  | { type: 'connection/add'; aId: string; bId: string; kind: Tie; label: string }
  | { type: 'connection/remove'; id: string }
  | { type: 'occasion/save'; occasion: Occasion }
  | { type: 'occasion/setOpen'; id: string; open: boolean }
  | { type: 'occasion/remove'; id: string }
  | {
      type: 'invite/send'
      occasionId: string
      profileId: string
      targetId: string
      score: number
      fit: number
      byMatchmaker: boolean
      note?: string
    }
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
    case 'account/create': {
      const person = action.person
      const exists = state.accountIds.includes(person.id)
      return {
        ...state,
        people: { ...state.people, [person.id]: person },
        accountIds: exists ? state.accountIds : [...state.accountIds, person.id],
        currentAccountId: person.id,
        activeProfileId: person.id,
      }
    }

    case 'account/switch': {
      if (!state.accountIds.includes(action.id)) return state
      return {
        ...state,
        currentAccountId: action.id,
        // Whoever you were swiping as doesn't carry across accounts.
        activeProfileId: action.id,
      }
    }

    case 'grant/request': {
      if (action.ownerId === action.wingmanId) return state
      const existing = grantBetween(state, action.ownerId, action.wingmanId)
      if (existing && (existing.status === 'pending' || existing.status === 'approved')) return state

      // Someone signed in here answers for themselves; anyone else replies in
      // their own time.
      const here = isOnDevice(state, action.ownerId)
      const { delayMs } = decideRequest(state, action.ownerId, action.wingmanId)
      const grant: WingmanGrant = {
        id: uid('g_'),
        ownerId: action.ownerId,
        wingmanId: action.wingmanId,
        status: 'pending',
        message: action.message?.trim() || undefined,
        requestedAt: Date.now(),
        revealAt: here ? undefined : Date.now() + delayMs,
      }
      const grants = existing
        ? state.grants.map((g) => (g.id === existing.id ? grant : g))
        : [grant, ...state.grants]

      const next: AppState = { ...state, grants }
      const owner = nameOf(state, action.ownerId)
      const wingman = nameOf(state, action.wingmanId)
      return {
        ...next,
        notifications: notify(next, {
          kind: 'wingman-request',
          title: here ? `${wingman} wants to be your wingman` : `Asked ${owner} to be their wingman`,
          body: here
            ? `${wingman} is asking to swipe for you.${action.message ? ` “${action.message}”` : ''}`
            : `Waiting on ${owner} to say yes.${action.message ? ` You said: “${action.message}”` : ''}`,
          profileId: action.ownerId,
          grantId: grant.id,
          audienceId: here ? action.ownerId : action.wingmanId,
        }),
      }
    }

    case 'grant/respond': {
      const grant = state.grants.find((g) => g.id === action.id)
      if (!grant || grant.status !== 'pending') return state
      return applyGrantAnswer(state, grant, action.status === 'approved', undefined)
    }

    case 'grant/revoke': {
      const grant = state.grants.find((g) => g.id === action.id)
      if (!grant) return state
      const grants = state.grants.map((g) =>
        g.id === action.id ? { ...g, status: 'revoked' as GrantStatus, respondedAt: Date.now() } : g,
      )
      // Stop swiping as someone who just took the keys back.
      const activeProfileId =
        state.activeProfileId === grant.ownerId && state.currentAccountId === grant.wingmanId
          ? state.currentAccountId
          : state.activeProfileId
      return { ...state, grants, activeProfileId }
    }

    case 'profile/save': {
      const exists = state.accountIds.includes(action.person.id)
      const next: AppState = {
        ...state,
        people: { ...state.people, [action.person.id]: action.person },
        accountIds: exists ? state.accountIds : [...state.accountIds, action.person.id],
        activeProfileId: state.activeProfileId ?? action.person.id,
      }
      if (exists) return next

      const who = displayRelationship(action.person)
      const forSomeoneElse =
        action.person.managed?.kind === 'other' &&
        state.currentAccountId !== null &&
        state.currentAccountId !== action.person.id

      const announced: AppState = {
        ...next,
        notifications: notify(next, {
          kind: 'profile-added',
          title: `${action.person.name} has an account`,
          body:
            action.person.managed?.kind === 'self'
              ? 'Your own profile is live. Swipe for yourself, and let friends ask to swipe for you.'
              : `${action.person.name} (${who.toLowerCase()}) is set up. Now they have to approve you before you can swipe for them.`,
          profileId: action.person.id,
          audienceId: state.currentAccountId ?? undefined,
        }),
      }
      if (!forSomeoneElse) return announced

      // Making someone's account doesn't make you their wingman — ask.
      return reducer(announced, {
        type: 'grant/request',
        ownerId: action.person.id,
        wingmanId: state.currentAccountId as string,
      })
    }

    case 'profile/remove': {
      const people = { ...state.people }
      // The profile's photos are bytes in IndexedDB — take them with it.
      void deletePhotos(people[action.id]?.photos ?? [])
      delete people[action.id]
      const accountIds = state.accountIds.filter((id) => id !== action.id)
      const currentAccountId =
        state.currentAccountId === action.id ? accountIds[0] ?? null : state.currentAccountId
      return {
        ...state,
        people,
        accountIds,
        currentAccountId,
        grants: state.grants.filter((g) => g.ownerId !== action.id && g.wingmanId !== action.id),
        activeProfileId:
          state.activeProfileId === action.id ? currentAccountId : state.activeProfileId,
        swipes: state.swipes.filter((s) => s.profileId !== action.id),
        pending: state.pending.filter((p) => p.profileId !== action.id),
        matches: state.matches.filter((m) => m.profileId !== action.id),
        occasions: state.occasions.filter((o) => o.profileId !== action.id),
        invites: state.invites.filter((i) => i.profileId !== action.id),
        connections: state.connections.filter((c) => !involves(c, action.id)),
        notifications: state.notifications.filter((n) => n.profileId !== action.id),
      }
    }

    case 'profile/setActive': {
      if (!state.currentAccountId) return state
      if (!canSwipeFor(state, state.currentAccountId, action.id)) return state
      return { ...state, activeProfileId: action.id }
    }

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

    case 'swipe/record':
      return {
        ...state,
        swipes: [
          ...state.swipes,
          {
            id: uid('s_'),
            profileId: action.profileId,
            targetId: action.targetId,
            direction: 'like',
            byMatchmaker: state.people[action.profileId]?.managed?.kind === 'other',
            score: action.score,
            at: Date.now(),
          },
        ],
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

    case 'connection/add': {
      if (action.aId === action.bId) return state
      // One link per pair — adding it again just updates how they know each other.
      const existing = state.connections.find(
        (c) => involves(c, action.aId) && involves(c, action.bId),
      )
      if (existing) {
        return {
          ...state,
          connections: state.connections.map((c) =>
            c.id === existing.id ? { ...c, kind: action.kind, label: action.label.trim() } : c,
          ),
        }
      }
      const connection: Connection = makeConnection(action.aId, action.bId, action.kind, action.label)
      return { ...state, connections: [connection, ...state.connections] }
    }

    case 'connection/remove':
      return { ...state, connections: state.connections.filter((c) => c.id !== action.id) }

    case 'occasion/save': {
      const exists = state.occasions.some((o) => o.id === action.occasion.id)
      const occasions = exists
        ? state.occasions.map((o) => (o.id === action.occasion.id ? action.occasion : o))
        : [action.occasion, ...state.occasions]
      const next: AppState = { ...state, occasions }
      if (exists) return next

      const profile = state.people[action.occasion.profileId]
      const meta = OCCASION_KINDS[action.occasion.kind]
      return {
        ...next,
        notifications: notify(next, {
          kind: 'occasion',
          title: `${profile?.name ?? 'Someone'} needs a date — ${meta.label.toLowerCase()}`,
          body: `${meta.emoji} ${action.occasion.title} · ${whenLabel(action.occasion.date)}. Swipe with the occasion switched on to find someone who actually suits it.`,
          profileId: action.occasion.profileId,
          occasionId: action.occasion.id,
        }),
      }
    }

    case 'occasion/setOpen':
      return {
        ...state,
        occasions: state.occasions.map((o) => (o.id === action.id ? { ...o, open: action.open } : o)),
      }

    case 'occasion/remove':
      return {
        ...state,
        occasions: state.occasions.filter((o) => o.id !== action.id),
        invites: state.invites.filter((i) => i.occasionId !== action.id),
        notifications: state.notifications.filter((n) => n.occasionId !== action.id),
      }

    case 'invite/send': {
      const occasion = state.occasions.find((o) => o.id === action.occasionId)
      if (!occasion) return state
      const already = state.invites.some(
        (i) => i.occasionId === action.occasionId && i.targetId === action.targetId,
      )
      if (already) return state

      const { accepted, reply, delayMs } = decideInvite(
        action.profileId,
        action.targetId,
        action.occasionId,
        action.score,
      )
      const invite: Invite = {
        id: uid('i_'),
        occasionId: action.occasionId,
        profileId: action.profileId,
        targetId: action.targetId,
        status: 'pending',
        score: action.score,
        fit: action.fit,
        byMatchmaker: action.byMatchmaker,
        note: action.note,
        sentAt: Date.now(),
        revealAt: Date.now() + delayMs,
        reply,
      }
      void accepted // decided now, revealed when revealAt passes

      const next: AppState = { ...state, invites: [invite, ...state.invites] }
      const profileName = nameOf(state, action.profileId)
      const targetName = nameOf(state, action.targetId)
      return {
        ...next,
        notifications: notify(next, {
          kind: 'invite',
          title: `Invitation sent to ${targetName}`,
          body: `${OCCASION_KINDS[occasion.kind].emoji} ${profileName} asked them to ${occasion.title} · ${whenLabel(occasion.date)}${action.note ? ` — "${action.note}"` : ''}.`,
          profileId: action.profileId,
          occasionId: occasion.id,
          inviteId: invite.id,
        }),
      }
    }

    case 'pending/resolve': {
      // Likes and invitations both come due on this tick, and either can be
      // empty — resolving one must never short-circuit the other.
      const due = state.pending.filter((p) => p.revealAt <= action.now)
      let next: AppState = due.length
        ? { ...state, pending: state.pending.filter((p) => p.revealAt > action.now) }
        : state
      for (const p of due) {
        if (!p.willMatch) continue
        next = applyMatch(next, p)
      }
      return resolveRequests(resolveInvites(next, action.now), action.now)
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
      const accountIds = [...state.accountIds]
      const grants = [...state.grants]
      for (const person of SAMPLE_ROSTER) {
        if (!people[person.id]) people[person.id] = person
        // Everyone gets their own account on this device, so you can switch in
        // as them and see the approval from their side.
        if (!accountIds.includes(person.id)) accountIds.push(person.id)
        // They already said yes — that's what the sample is demonstrating.
        if (state.currentAccountId && person.id !== state.currentAccountId) {
          const already = grants.some(
            (g) => g.ownerId === person.id && g.wingmanId === state.currentAccountId,
          )
          if (!already) {
            grants.push({
              id: uid('g_'),
              ownerId: person.id,
              wingmanId: state.currentAccountId,
              status: 'approved',
              requestedAt: Date.now(),
              respondedAt: Date.now(),
            })
          }
        }
      }
      const occasions = [...state.occasions]
      for (const occasion of SAMPLE_OCCASIONS) {
        if (!occasions.some((o) => o.id === occasion.id)) occasions.push(occasion)
      }
      const connections = [...state.connections]
      for (const link of SAMPLE_CONNECTIONS) {
        const exists = connections.some(
          (c) => involves(c, link.aId) && involves(c, link.bId),
        )
        if (!exists && people[link.aId] && people[link.bId]) {
          connections.push(makeConnection(link.aId, link.bId, link.kind, link.label))
        }
      }
      return {
        ...state,
        people,
        accountIds,
        grants,
        occasions,
        connections,
        activeProfileId: state.activeProfileId ?? state.currentAccountId ?? accountIds[0] ?? null,
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

/**
 * Reveal the answer to every invitation whose time has come. The answer is a
 * pure function of the pairing, so it survives a reload unchanged.
 */
function resolveInvites(state: AppState, now: number): AppState {
  // Oldest answer first, so whoever replied earliest gets the spot.
  const due = state.invites
    .filter((i) => i.status === 'pending' && i.revealAt <= now)
    .sort((a, b) => a.revealAt - b.revealAt)
  if (!due.length) return state

  let next = state
  for (const invite of due) {
    const occasion = next.occasions.find((o) => o.id === invite.occasionId)

    // You can ask several people, but only the first yes counts. Anyone still
    // waiting once the spot is filled gets their invitation withdrawn rather
    // than a second acceptance for a date that only needs one person.
    const filled = next.invites.some(
      (i) => i.occasionId === invite.occasionId && i.status === 'accepted',
    )
    const decision = decideInvite(invite.profileId, invite.targetId, invite.occasionId, invite.score)
    const accepted = !filled && decision.accepted
    const status: InviteStatus = accepted ? 'accepted' : 'declined'
    const reply = filled ? WITHDRAWN : invite.reply
    const invites = next.invites.map((i) => (i.id === invite.id ? { ...i, status, reply } : i))
    // A filled occasion stops taking invitations.
    const occasions = accepted
      ? next.occasions.map((o) => (o.id === invite.occasionId ? { ...o, open: false } : o))
      : next.occasions
    next = { ...next, invites, occasions }

    const profileName = nameOf(next, invite.profileId)
    const targetName = nameOf(next, invite.targetId)
    const title = occasion?.title ?? 'the plan'
    const when = occasion ? ` · ${whenLabel(occasion.date)}` : ''
    next = {
      ...next,
      notifications: notify(next, {
        kind: accepted ? 'invite-accepted' : 'invite-declined',
        title: accepted
          ? `${targetName} said yes — ${profileName} has a date`
          : filled
            ? `Took back the ask to ${targetName}`
            : `${targetName} can't make it`,
        body: filled
          ? `${title}${when} was already sorted, so ${targetName}'s invitation was withdrawn.`
          : `${title}${when} — “${reply ?? ''}”`,
        profileId: invite.profileId,
        occasionId: invite.occasionId,
        inviteId: invite.id,
      }),
    }

    // One date is all this needs, so nobody is left waiting on an answer.
    if (accepted) next = withdrawRemaining(next, invite.occasionId, title, when)
  }
  return next
}

/** Answer every wingman request whose time has come. */
function resolveRequests(state: AppState, now: number): AppState {
  const due = state.grants.filter(
    (g) => g.status === 'pending' && g.revealAt !== undefined && g.revealAt <= now,
  )
  if (!due.length) return state

  let next = state
  for (const grant of due) {
    const { approved, reply } = decideRequest(next, grant.ownerId, grant.wingmanId)
    next = applyGrantAnswer(next, grant, approved, reply)
  }
  return next
}

/** Record an answer to a request and tell whoever is waiting on it. */
function applyGrantAnswer(
  state: AppState,
  grant: WingmanGrant,
  approved: boolean,
  reply: string | undefined,
): AppState {
  const status: GrantStatus = approved ? 'approved' : 'declined'
  const grants = state.grants.map((g) =>
    g.id === grant.id ? { ...g, status, respondedAt: Date.now(), revealAt: undefined, reply } : g,
  )
  const next: AppState = { ...state, grants }
  const owner = nameOf(next, grant.ownerId)
  const wingman = nameOf(next, grant.wingmanId)
  return {
    ...next,
    notifications: notify(next, {
      kind: approved ? 'wingman-approved' : 'wingman-declined',
      title: approved
        ? `${owner} said yes — you can swipe for them`
        : `${owner} would rather swipe for themselves`,
      body: reply
        ? `“${reply}”`
        : approved
          ? `${wingman} can now swipe on ${owner}'s behalf. Pick them from the dropdown on the deck.`
          : `${wingman}'s request was declined.`,
      profileId: grant.ownerId,
      grantId: grant.id,
      audienceId: grant.wingmanId,
    }),
  }
}

const WITHDRAWN = 'Withdrawn — the spot was already taken.'

/** Close out every invitation still waiting on an occasion that just filled. */
function withdrawRemaining(state: AppState, occasionId: string, title: string, when: string): AppState {
  const waiting = state.invites.filter((i) => i.occasionId === occasionId && i.status === 'pending')
  if (!waiting.length) return state

  const ids = new Set(waiting.map((i) => i.id))
  const next: AppState = {
    ...state,
    invites: state.invites.map((i) =>
      ids.has(i.id) ? { ...i, status: 'declined' as InviteStatus, reply: WITHDRAWN } : i,
    ),
  }
  const names = waiting.map((i) => nameOf(next, i.targetId))
  return {
    ...next,
    notifications: notify(next, {
      kind: 'invite-declined',
      title: `Took back ${waiting.length} other ask${waiting.length === 1 ? '' : 's'}`,
      body: `${title}${when} is sorted, so ${names.slice(0, 3).join(', ')}${names.length > 3 ? ' and others' : ''} were told it's filled.`,
      occasionId,
    }),
  }
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
  createAccount: (person: Person) => void
  switchAccount: (id: string) => void
  requestWingman: (args: { ownerId: string; wingmanId: string; message?: string }) => void
  respondToRequest: (id: string, status: 'approved' | 'declined') => void
  revokeGrant: (id: string) => void
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
  recordSwipe: (args: { profileId: string; targetId: string; score: number }) => void
  addConnection: (args: { aId: string; bId: string; kind: Tie; label: string }) => void
  removeConnection: (id: string) => void
  saveOccasion: (occasion: Occasion) => void
  setOccasionOpen: (id: string, open: boolean) => void
  removeOccasion: (id: string) => void
  sendInvite: (args: {
    occasionId: string
    profileId: string
    targetId: string
    score: number
    fit: number
    byMatchmaker: boolean
    note?: string
  }) => void
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
      createAccount: (person) => dispatch({ type: 'account/create', person }),
      switchAccount: (id) => dispatch({ type: 'account/switch', id }),
      requestWingman: (args) => dispatch({ type: 'grant/request', ...args }),
      respondToRequest: (id, status) => dispatch({ type: 'grant/respond', id, status }),
      revokeGrant: (id) => dispatch({ type: 'grant/revoke', id }),
      saveProfile: (person) => dispatch({ type: 'profile/save', person }),
      removeProfile: (id) => dispatch({ type: 'profile/remove', id }),
      setActiveProfile: (id) => dispatch({ type: 'profile/setActive', id }),
      swipe: (args) => dispatch({ type: 'swipe', ...args }),
      undoSwipe: (profileId) => dispatch({ type: 'swipe/undo', profileId }),
      recordSwipe: (args) => dispatch({ type: 'swipe/record', ...args }),
      addConnection: (args) => dispatch({ type: 'connection/add', ...args }),
      removeConnection: (id) => dispatch({ type: 'connection/remove', id }),
      saveOccasion: (occasion) => dispatch({ type: 'occasion/save', occasion }),
      setOccasionOpen: (id, open) => dispatch({ type: 'occasion/setOpen', id, open }),
      removeOccasion: (id) => dispatch({ type: 'occasion/remove', id }),
      sendInvite: (args) => dispatch({ type: 'invite/send', ...args }),
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

/** Convenience: the profile currently being swiped for. */
export function useActiveProfile(): Person | null {
  const { state } = useApp()
  const id = state.activeProfileId
  return id ? state.people[id] ?? null : null
}

export const _internal = { reducer, applyMatch }

/** Unread notifications addressed to the account in use. */
export function useUnreadCount(): number {
  const { state } = useApp()
  return useMemo(
    () =>
      state.notifications.filter(
        (n) => !n.read && (!n.audienceId || n.audienceId === state.currentAccountId),
      ).length,
    [state.notifications, state.currentAccountId],
  )
}
