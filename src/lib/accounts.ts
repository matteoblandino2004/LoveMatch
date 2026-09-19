import type { AppState, Person, WingmanGrant } from '../types'
import { areConnected, connectionsFor } from './connections'
import { pairRandom } from './id'

/** The person whose account is in use right now. */
export function currentAccount(state: AppState): Person | null {
  return state.currentAccountId ? state.people[state.currentAccountId] ?? null : null
}

/** Accounts signed in on this device. */
export function accountsOnDevice(state: AppState): Person[] {
  return state.accountIds.map((id) => state.people[id]).filter(Boolean)
}

export function isOnDevice(state: AppState, personId: string): boolean {
  return state.accountIds.includes(personId)
}

export function grantBetween(
  state: AppState,
  ownerId: string,
  wingmanId: string,
): WingmanGrant | undefined {
  return state.grants.find((g) => g.ownerId === ownerId && g.wingmanId === wingmanId)
}

/** May this person swipe on that person's behalf? */
export function canSwipeFor(state: AppState, wingmanId: string, ownerId: string): boolean {
  if (wingmanId === ownerId) return true
  return grantBetween(state, ownerId, wingmanId)?.status === 'approved'
}

/**
 * Everyone this account can swipe for: themselves first, then whoever approved
 * them. This is the dropdown at the top of the deck.
 */
export function swipeableFor(state: AppState, wingmanId: string | null): Person[] {
  if (!wingmanId) return []
  const me = state.people[wingmanId]
  const others = state.grants
    .filter((g) => g.wingmanId === wingmanId && g.status === 'approved')
    .map((g) => state.people[g.ownerId])
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name))
  return me ? [me, ...others] : others
}

/** Requests waiting on this person's answer. */
export function requestsAwaiting(state: AppState, ownerId: string | null): WingmanGrant[] {
  if (!ownerId) return []
  return state.grants.filter((g) => g.ownerId === ownerId && g.status === 'pending')
}

/** Requests this person has sent that nobody has answered yet. */
export function requestsSent(state: AppState, wingmanId: string | null): WingmanGrant[] {
  if (!wingmanId) return []
  return state.grants.filter((g) => g.wingmanId === wingmanId && g.status === 'pending')
}

/** Anything scoped to a profile is only yours to see if you can act for them. */
export function visibleProfileIds(state: AppState): string[] {
  return swipeableFor(state, state.currentAccountId).map((p) => p.id)
}

const YES_REPLIES = [
  'Go on then. Be gentle.',
  "Yes — I trust your taste more than mine.",
  'Fine, but no one from work.',
  "You've been asking for years. Do your worst.",
  'Approved. I want a full report.',
]

const NO_REPLIES = [
  "Thanks, but I'd rather do my own swiping.",
  'Maybe later — let me try this myself first.',
  'I love you, but no.',
  "I'm not really looking right now.",
]

/**
 * How someone not signed in here answers a wingman request. Family says yes
 * far more often than a stranger does, and it's deterministic per pair so the
 * answer doesn't change on reload.
 */
export function decideRequest(state: AppState, ownerId: string, wingmanId: string) {
  const family = connectionsFor(state, ownerId, 'family').some((l) => l.person.id === wingmanId)
  const friend = areConnected(state, ownerId, wingmanId)
  const probability = family ? 0.92 : friend ? 0.75 : 0.18

  const roll = pairRandom(ownerId, wingmanId, 'wingman')
  const approved = roll < probability

  const pick = pairRandom(ownerId, wingmanId, 'wingman-reply')
  const lines = approved ? YES_REPLIES : NO_REPLIES
  const reply = lines[Math.floor(pick * lines.length) % lines.length]

  const wait = pairRandom(ownerId, wingmanId, 'wingman-wait')
  return { approved, reply, delayMs: Math.round(5000 + wait * 25000) }
}

/** "Your sister", "A friend", "Someone you haven't met". */
export function describeTie(state: AppState, aId: string, bId: string): string {
  const family = connectionsFor(state, aId, 'family').find((l) => l.person.id === bId)
  if (family) return family.connection.label
  const friend = connectionsFor(state, aId, 'friend').find((l) => l.person.id === bId)
  if (friend) return friend.connection.label
  return 'Not connected yet'
}
