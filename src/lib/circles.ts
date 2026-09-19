import type { AppState, Person, Swipe } from '../types'
import { MY_CIRCLE } from '../types'
import { compatibility, eligibleFor } from './compatibility'
import { swipeableFor } from './accounts'

export interface Ranked {
  person: Person
  /** Compatibility with whoever the list is anchored on. */
  score: number
  /** Both sides are open to each other's gender. */
  eligible: boolean
  /** This exact pairing has already been swiped on. */
  seen: boolean
}

/**
 * Score a set of people against one anchor person, best first.
 *
 * Used in both directions: "who on my roster fits this candidate best?" and
 * "who else is this matchmaker setting up?". The caller says what counts as
 * already swiped, because the two directions address the pairing differently.
 */
export function rankAgainst(
  anchor: Person,
  others: Person[],
  isSeen: (other: Person) => boolean,
): Ranked[] {
  return others
    .filter((other) => other.id !== anchor.id)
    .map((person) => ({
      person,
      score: compatibility(anchor, person).score,
      eligible: eligibleFor(anchor, person) && eligibleFor(person, anchor),
      seen: isSeen(person),
    }))
    .sort((a, b) => {
      // Anyone still available outranks someone already judged.
      if (a.seen !== b.seen) return a.seen ? 1 : -1
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1
      return b.score - a.score
    })
}

/** Everyone the same matchmaker is setting up. */
export function circleMembers(state: AppState, circleId: string): Person[] {
  if (circleId === MY_CIRCLE) {
    return swipeableFor(state, state.currentAccountId)
  }
  return Object.values(state.people).filter((p) => p.circle?.id === circleId)
}

/** "Who that I can swipe for should meet this person?" */
export function rosterFitFor(state: AppState, candidate: Person): Ranked[] {
  return rankAgainst(candidate, swipeableFor(state, state.currentAccountId), (profile) =>
    hasSwiped(state.swipes, profile.id, candidate.id),
  )
}

/** "Who else does this person's matchmaker know?", scored against your profile. */
export function circleFitFor(state: AppState, viewer: Person, circleId: string): Ranked[] {
  const members = circleMembers(state, circleId)
  return rankAgainst(viewer, members, (member) => hasSwiped(state.swipes, viewer.id, member.id))
}

function hasSwiped(swipes: Swipe[], profileId: string, targetId: string): boolean {
  return swipes.some((s) => s.profileId === profileId && s.targetId === targetId)
}
