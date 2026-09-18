import type { AppState } from '../types'
import { COMMUNITY } from './seed'

const KEY = 'lovematch.state.v1'
export const STATE_VERSION = 2

export function emptyState(): AppState {
  const people: Record<string, (typeof COMMUNITY)[number]> = {}
  for (const person of COMMUNITY) people[person.id] = person
  return {
    account: null,
    people,
    rosterIds: [],
    communityIds: COMMUNITY.map((p) => p.id),
    swipes: [],
    pending: [],
    matches: [],
    notifications: [],
    activeProfileId: null,
    version: STATE_VERSION,
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyState()
    const parsed = migrate(JSON.parse(raw))
    if (!parsed) return emptyState()
    // Fold in community members added since this state was saved.
    const base = emptyState()
    const people = { ...base.people, ...parsed.people }
    const communityIds = Array.from(new Set([...base.communityIds, ...parsed.communityIds]))
    return { ...parsed, people, communityIds }
  } catch {
    return emptyState()
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Private browsing or a full quota — the app still works for this session.
  }
}

/**
 * Bring an older saved state forward rather than wiping someone's roster.
 * Returns null when the state is too old to understand.
 */
function migrate(parsed: AppState): AppState | null {
  let state = parsed
  if (state.version === 1) {
    // v2 added photos and matchmaker circles.
    const people = Object.fromEntries(
      Object.entries(state.people).map(([id, person]) => [id, { ...person, photos: person.photos ?? [] }]),
    )
    state = { ...state, people, version: 2 }
  }
  return state.version === STATE_VERSION ? state : null
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nothing to do */
  }
}
