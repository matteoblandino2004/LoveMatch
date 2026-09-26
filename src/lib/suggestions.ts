import type { AppState, Person, Suggestion, SuggestionStatus } from '../types'

export interface SuggestionCard {
  suggestion: Suggestion
  /** The person being suggested. */
  target: Person
  /** The friend who sent it. */
  wingman: Person
}

/** Picks sent to this account, newest first. */
export function suggestionsFor(
  state: AppState,
  profileId: string | null,
  status: SuggestionStatus = 'waiting',
): SuggestionCard[] {
  if (!profileId) return []
  return state.suggestions
    .filter((s) => s.profileId === profileId && s.status === status)
    .map((suggestion) => ({
      suggestion,
      target: state.people[suggestion.targetId],
      wingman: state.people[suggestion.wingmanId],
    }))
    .filter((card): card is SuggestionCard => card.target !== undefined && card.wingman !== undefined)
    .sort((a, b) => b.suggestion.at - a.suggestion.at)
}

/** How many picks are waiting on you — the number on the tab. */
export function waitingCount(state: AppState, profileId: string | null): number {
  if (!profileId) return 0
  return state.suggestions.filter((s) => s.profileId === profileId && s.status === 'waiting').length
}

/** Has this person already been suggested to them, by anyone? */
export function alreadySuggested(state: AppState, profileId: string, targetId: string): boolean {
  return state.suggestions.some(
    (s) => s.profileId === profileId && s.targetId === targetId && s.status !== 'passed',
  )
}
