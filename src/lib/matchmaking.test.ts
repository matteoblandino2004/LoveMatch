import { describe, expect, it } from 'vitest'
import { buildDeck, decideReciprocal, eligibleCount } from './matchmaking'
import { emptyState } from './storage'
import { makePerson } from './people'
import { pairRandom } from './id'
import type { AppState, Person } from '../types'

function stateWith(profile: Person): AppState {
  const base = emptyState()
  return {
    ...base,
    people: { ...base.people, [profile.id]: profile },
    accountIds: [profile.id],
    currentAccountId: profile.id,
    activeProfileId: profile.id,
  }
}

const maya = makePerson({
  id: 'r_test', name: 'Maya', age: 30, gender: 'woman', interestedIn: ['man'],
  city: 'Brooklyn, NY', interests: ['Cooking', 'Live music', 'Dogs'],
  managed: { kind: 'other', relationship: 'My sister', pitch: '', consented: true },
})

describe('decideReciprocal', () => {
  it('is deterministic for a given pair', () => {
    const first = decideReciprocal('a', 'b', 70)
    const second = decideReciprocal('a', 'b', 70)
    expect(first).toEqual(second)
  })

  it('likes back far more often at high compatibility than at low', () => {
    let high = 0
    let low = 0
    for (let i = 0; i < 400; i++) {
      if (decideReciprocal(`p${i}`, `t${i}`, 92).willMatch) high++
      if (decideReciprocal(`p${i}`, `t${i}`, 18).willMatch) low++
    }
    expect(high).toBeGreaterThan(low * 3)
  })

  it('never returns a negative delay', () => {
    for (let i = 0; i < 50; i++) {
      expect(decideReciprocal(`x${i}`, `y${i}`, 50).delayMs).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('buildDeck', () => {
  it('only offers people who are open to this profile, and vice versa', () => {
    const state = stateWith(maya)
    const deck = buildDeck(state, maya)
    expect(deck.length).toBeGreaterThan(0)
    for (const entry of deck) {
      expect(entry.person.gender).toBe('man')
      expect(entry.person.interestedIn).toContain('woman')
    }
  })

  it('leaves out anyone already swiped on', () => {
    const state = stateWith(maya)
    const target = buildDeck(state, maya)[0].person
    const after = buildDeck(
      {
        ...state,
        swipes: [
          {
            id: 's1', profileId: maya.id, targetId: target.id, direction: 'like',
            byMatchmaker: true, score: 70, at: Date.now(),
          },
        ],
      },
      maya,
    )
    expect(after.map((e) => e.person.id)).not.toContain(target.id)
  })

  it('leads with a strong fit rather than a random one', () => {
    const deck = buildDeck(stateWith(maya), maya)
    const best = Math.max(...deck.map((e) => e.score))
    expect(deck[0].score).toBeGreaterThan(best - 14)
  })

  it('counts the eligible pool independently of what has been seen', () => {
    expect(eligibleCount(stateWith(maya), maya)).toBe(buildDeck(stateWith(maya), maya).length)
  })
})

describe('hashing', () => {
  it('scatters rolls when only the tail of the salt changes', () => {
    // Regression: FNV without a finalizer left near-identical high bits for
    // strings sharing a prefix, so every invitation got the same answer.
    const rolls = Array.from({ length: 40 }, (_, i) => pairRandom('a', 'b', `invite-o${i}`))
    const mean = rolls.reduce((sum, r) => sum + r, 0) / rolls.length
    expect(mean).toBeGreaterThan(0.35)
    expect(mean).toBeLessThan(0.65)
    expect(Math.max(...rolls) - Math.min(...rolls)).toBeGreaterThan(0.8)
  })
})
