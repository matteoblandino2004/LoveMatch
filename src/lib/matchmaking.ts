import type { AppState, Person } from '../types'
import { compatibility, mutuallyEligible } from './compatibility'
import { pairRandom } from './id'

/**
 * Whether the other person likes the profile back, and how long they take.
 * Deterministic per pair, so the simulated world stays consistent across
 * reloads instead of re-rolling the dice every render.
 */
export function decideReciprocal(profileId: string, targetId: string, score: number) {
  const roll = pairRandom(profileId, targetId, 'like-back')
  // A 90-point match nearly always lands; a 30-point one rarely does.
  const probability = Math.min(0.94, 0.05 + Math.pow(score / 100, 1.5) * 0.95)
  const willMatch = roll < probability

  const instant = pairRandom(profileId, targetId, 'instant') > 0.45
  const wait = pairRandom(profileId, targetId, 'wait')
  const delayMs = instant ? 0 : Math.round(6000 + wait * 40000)
  return { willMatch, delayMs }
}

export interface DeckEntry {
  person: Person
  score: number
}

/**
 * Who this profile should see next: everyone eligible they haven't judged yet,
 * best fits first with a little jitter so the deck doesn't feel like a ranking.
 */
export function buildDeck(state: AppState, profile: Person): DeckEntry[] {
  const seen = new Set(
    state.swipes.filter((s) => s.profileId === profile.id).map((s) => s.targetId),
  )
  const entries: DeckEntry[] = []
  for (const id of state.communityIds) {
    if (seen.has(id) || id === profile.id) continue
    const person = state.people[id]
    if (!person) continue
    if (!mutuallyEligible(profile, person)) continue
    entries.push({ person, score: compatibility(profile, person).score })
  }
  return entries.sort((a, b) => {
    const jitterA = pairRandom(profile.id, a.person.id, 'order') * 12
    const jitterB = pairRandom(profile.id, b.person.id, 'order') * 12
    return b.score + jitterB - (a.score + jitterA)
  })
}

/** Everyone eligible for this profile, judged or not — used for roster stats. */
export function eligibleCount(state: AppState, profile: Person): number {
  return state.communityIds.filter((id) => {
    const person = state.people[id]
    return person && mutuallyEligible(profile, person)
  }).length
}
