import { describe, expect, it } from 'vitest'
import { circleFitFor, circleMembers, rankAgainst, rosterFitFor } from './circles'
import { emptyState } from './storage'
import { makePerson } from './people'
import { MY_CIRCLE, type AppState, type Person, type Swipe } from '../types'

function roster(id: string, over: Partial<Person> = {}): Person {
  return makePerson({
    id, name: id, age: 30, gender: 'woman', interestedIn: ['man'], city: 'Brooklyn, NY',
    interests: ['Cooking', 'Live music', 'Dogs'],
    managed: { kind: 'other', relationship: 'My sister', pitch: '', consented: true },
    ...over,
  })
}

/** Signed in as the first person, with everyone else having approved them. */
function stateWith(people: Person[]): AppState {
  const base = emptyState()
  const added = Object.fromEntries(people.map((p) => [p.id, p]))
  const me = people[0]?.id ?? null
  return {
    ...base,
    people: { ...base.people, ...added },
    accountIds: people.map((p) => p.id),
    currentAccountId: me,
    activeProfileId: me,
    grants: people.slice(1).map((p) => ({
      id: `g_${p.id}`,
      ownerId: p.id,
      wingmanId: me as string,
      status: 'approved' as const,
      requestedAt: 0,
      respondedAt: 0,
    })),
  }
}

const swipe = (profileId: string, targetId: string): Swipe => ({
  id: `s_${profileId}_${targetId}`, profileId, targetId, direction: 'like',
  byMatchmaker: true, score: 70, at: Date.now(),
})

describe('rankAgainst', () => {
  const anchor = roster('anchor', { gender: 'man', interestedIn: ['woman'] })

  it('puts the strongest fit first', () => {
    const twin = roster('twin')
    const stranger = roster('stranger', { interests: ['Chess'], age: 48, city: 'Seoul, KR' })
    const ranked = rankAgainst(anchor, [stranger, twin], () => false)
    expect(ranked[0].person.id).toBe('twin')
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score)
  })

  it('sinks pairings that have already been swiped on', () => {
    const twin = roster('twin')
    const other = roster('other', { interests: ['Cooking'] })
    const ranked = rankAgainst(anchor, [twin, other], (p) => p.id === 'twin')
    expect(ranked[0].person.id).toBe('other')
    expect(ranked[1].seen).toBe(true)
  })

  it('sinks people who are not open to each other, and marks them ineligible', () => {
    const open = roster('open')
    const closed = roster('closed', { interestedIn: ['woman'] })
    const ranked = rankAgainst(anchor, [closed, open], () => false)
    expect(ranked[0].person.id).toBe('open')
    expect(ranked.find((r) => r.person.id === 'closed')!.eligible).toBe(false)
  })

  it('never ranks the anchor against itself', () => {
    expect(rankAgainst(anchor, [anchor, roster('a')], () => false)).toHaveLength(1)
  })
})

describe('rosterFitFor', () => {
  it('scores every roster profile against one candidate', () => {
    const state = stateWith([roster('r_a'), roster('r_b', { age: 44 })])
    const ranked = rosterFitFor(state, state.people.c_daniel)
    expect(ranked.map((r) => r.person.id).sort()).toEqual(['r_a', 'r_b'])
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score)
  })

  it('marks a profile that already swiped on this candidate', () => {
    const base = stateWith([roster('r_a'), roster('r_b')])
    const state = { ...base, swipes: [swipe('r_a', 'c_daniel')] }
    const ranked = rosterFitFor(state, state.people.c_daniel)
    expect(ranked.find((r) => r.person.id === 'r_a')!.seen).toBe(true)
    expect(ranked.find((r) => r.person.id === 'r_b')!.seen).toBe(false)
  })
})

describe('circleMembers', () => {
  it('gathers everyone the same matchmaker is setting up', () => {
    const state = emptyState()
    const rosa = circleMembers(state, 'mm_rosa')
    expect(rosa.length).toBeGreaterThan(1)
    expect(rosa.every((p) => p.circle?.matchmaker === 'Rosa')).toBe(true)
    expect(rosa.map((p) => p.id)).toContain('c_daniel')
  })

  it('treats your own roster as your circle', () => {
    const state = stateWith([roster('r_a'), roster('r_b')])
    expect(circleMembers(state, MY_CIRCLE).map((p) => p.id)).toEqual(['r_a', 'r_b'])
  })
})

describe('circleFitFor', () => {
  it("ranks a matchmaker's other people against the profile you're swiping as", () => {
    const viewer = roster('r_a')
    const state = stateWith([viewer])
    const ranked = circleFitFor(state, viewer, 'mm_rosa')
    expect(ranked.length).toBeGreaterThan(1)
    // Rosa sets up men and women; only the men are open to this viewer.
    expect(ranked[0].eligible).toBe(true)
    expect(ranked.some((r) => !r.eligible)).toBe(true)
  })
})
