import type { AppState } from '../types'
import { COMMUNITY, COMMUNITY_CONNECTIONS } from './seed'
import { makeConnection } from './connections'
import { blankPerson, defaultPreferences } from './people'
import type { Person, WingmanGrant } from '../types'

const KEY = 'wingman.state.v1'
export const STATE_VERSION = 6

export function emptyState(): AppState {
  const people: Record<string, (typeof COMMUNITY)[number]> = {}
  for (const person of COMMUNITY) people[person.id] = person
  return {
    accountIds: [],
    currentAccountId: null,
    grants: [],
    people,

    communityIds: COMMUNITY.map((p) => p.id),
    swipes: [],
    pending: [],
    matches: [],
    occasions: [],
    invites: [],
    connections: COMMUNITY_CONNECTIONS.map((l) => makeConnection(l.aId, l.bId, l.kind, l.label)),
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
  if (state.version === 2) {
    // v3 added occasions and invitations.
    state = { ...state, occasions: [], invites: [], version: 3 }
  }
  if (state.version === 3) {
    // v4 moved age and distance into a preferences object and added hair,
    // height range and dealbreakers alongside them.
    const people = Object.fromEntries(
      Object.entries(state.people).map(([id, person]) => {
        const legacy = person as unknown as { ageMin?: number; ageMax?: number; maxDistanceKm?: number }
        return [
          id,
          {
            ...person,
            hair: person.hair ?? 'brown',
            prefs: person.prefs ?? defaultPreferences(person.age, {
              ageMin: legacy.ageMin,
              ageMax: legacy.ageMax,
              maxDistanceKm: legacy.maxDistanceKm,
            }),
          },
        ]
      }),
    )
    state = { ...state, people, version: 4 }
  }
  if (state.version === 4) {
    // v5 added family and friend links between people.
    state = { ...state, connections: emptyState().connections, version: 5 }
  }
  if (state.version === 5) {
    state = migrateToAccounts(state)
  }
  return state.version === STATE_VERSION ? state : null
}

/**
 * v6 turned "profiles I made for people" into accounts plus permission. Your
 * own profile becomes your account; everyone you were already managing becomes
 * an account here too, and the consent checkbox they used to carry becomes a
 * real grant — ticked means approved, unticked means still waiting on them.
 */
function migrateToAccounts(old: AppState): AppState {
  const legacy = old as unknown as {
    account?: { name: string; createdAt: number } | null
    rosterIds?: string[]
    people: Record<string, Person>
  }
  const rosterIds = legacy.rosterIds ?? []
  const people = { ...old.people }

  let meId = rosterIds.find((id) => people[id]?.managed?.kind === 'self') ?? null
  if (!meId) {
    // They never made a profile for themselves — give them one from the name
    // they signed up with, so there's an account to own everything.
    const me = blankPerson('self')
    me.name = legacy.account?.name || 'You'
    people[me.id] = me
    meId = me.id
  }

  const accountIds = [meId, ...rosterIds.filter((id) => id !== meId && people[id])]
  const grants: WingmanGrant[] = rosterIds
    .filter((id) => id !== meId && people[id])
    .map((id) => ({
      id: `g_migrated_${id}`,
      ownerId: id,
      wingmanId: meId as string,
      status: people[id].managed?.consented === false ? 'pending' : 'approved',
      requestedAt: people[id].createdAt,
      respondedAt: people[id].managed?.consented === false ? undefined : people[id].createdAt,
    }))

  return {
    ...old,
    people,
    accountIds,
    currentAccountId: meId,
    grants,
    activeProfileId: old.activeProfileId ?? meId,
    version: 6,
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nothing to do */
  }
}
