import { describe, expect, it } from 'vitest'
import { _internal } from './store'
import { emptyState } from '../lib/storage'
import { makePerson } from '../lib/people'
import { decideReciprocal } from '../lib/matchmaking'
import type { AppState, Person } from '../types'

const { reducer } = _internal

function rosterProfile(id: string): Person {
  return makePerson({
    id, name: 'Maya', age: 30, gender: 'woman', interestedIn: ['man'], city: 'Brooklyn, NY',
    managed: { kind: 'other', relationship: 'My sister', pitch: 'She deserves it.', consented: true },
  })
}

/** Find a profile id whose like on `targetId` lands immediately, so the test is deterministic. */
function idThatMatchesInstantly(targetId: string, score: number): string {
  for (let i = 0; i < 2000; i++) {
    const id = `r_${i}`
    const { willMatch, delayMs } = decideReciprocal(id, targetId, score)
    if (willMatch && delayMs === 0) return id
  }
  throw new Error('no instant-matching id found')
}

function idThatMatchesLater(targetId: string, score: number): string {
  for (let i = 0; i < 2000; i++) {
    const id = `r_${i}`
    const { willMatch, delayMs } = decideReciprocal(id, targetId, score)
    if (willMatch && delayMs > 0) return id
  }
  throw new Error('no delayed-matching id found')
}

function withProfile(profile: Person): AppState {
  return reducer(emptyState(), { type: 'profile/save', person: profile })
}

describe('profiles', () => {
  it('adds a profile to the roster, makes it active and announces it', () => {
    const state = withProfile(rosterProfile('r_a'))
    expect(state.rosterIds).toEqual(['r_a'])
    expect(state.activeProfileId).toBe('r_a')
    expect(state.notifications[0].kind).toBe('profile-added')
  })

  it('edits in place without duplicating or re-announcing', () => {
    const first = withProfile(rosterProfile('r_a'))
    const edited = reducer(first, {
      type: 'profile/save',
      person: { ...first.people.r_a, name: 'Maya Rose' },
    })
    expect(edited.rosterIds).toEqual(['r_a'])
    expect(edited.people.r_a.name).toBe('Maya Rose')
    expect(edited.notifications).toHaveLength(first.notifications.length)
  })

  it('supports an unlimited roster', () => {
    let state = emptyState()
    for (let i = 0; i < 25; i++) {
      state = reducer(state, { type: 'profile/save', person: rosterProfile(`r_${i}`) })
    }
    expect(state.rosterIds).toHaveLength(25)
  })

  it('removes a profile along with everything attached to it', () => {
    const id = idThatMatchesInstantly('c_daniel', 90)
    let state = withProfile(rosterProfile(id))
    state = reducer(state, {
      type: 'swipe', profileId: id, targetId: 'c_daniel', direction: 'like',
      byMatchmaker: true, score: 90,
    })
    expect(state.matches).toHaveLength(1)

    state = reducer(state, { type: 'profile/remove', id })
    expect(state.rosterIds).toHaveLength(0)
    expect(state.matches).toHaveLength(0)
    expect(state.swipes).toHaveLength(0)
    expect(state.notifications.filter((n) => n.profileId === id)).toHaveLength(0)
  })
})

describe('swiping', () => {
  it('records a pass without notifying anyone', () => {
    const state = reducer(withProfile(rosterProfile('r_a')), {
      type: 'swipe', profileId: 'r_a', targetId: 'c_daniel', direction: 'pass',
      byMatchmaker: true, score: 40,
    })
    expect(state.swipes).toHaveLength(1)
    expect(state.matches).toHaveLength(0)
    expect(state.notifications.some((n) => n.kind === 'matchmaker-swipe')).toBe(false)
  })

  it("tells the person when their matchmaker picks someone", () => {
    const state = reducer(withProfile(rosterProfile('r_a')), {
      type: 'swipe', profileId: 'r_a', targetId: 'c_daniel', direction: 'like',
      byMatchmaker: true, note: 'Trust me.', score: 80,
    })
    const note = state.notifications.find((n) => n.kind === 'matchmaker-swipe')
    expect(note?.body).toContain('Daniel')
    expect(note?.body).toContain('Trust me.')
  })

  it('creates the match and the notification when the like is instant', () => {
    const id = idThatMatchesInstantly('c_daniel', 88)
    const state = reducer(withProfile(rosterProfile(id)), {
      type: 'swipe', profileId: id, targetId: 'c_daniel', direction: 'like',
      byMatchmaker: true, note: 'You two would not stop talking.', score: 88,
    })
    expect(state.matches).toHaveLength(1)
    expect(state.matches[0]).toMatchObject({ targetId: 'c_daniel', score: 88, byMatchmaker: true })
    expect(state.notifications[0].kind).toBe('match')
    expect(state.pending).toHaveLength(0)
  })

  it('holds a delayed like until its reveal time passes', () => {
    const id = idThatMatchesLater('c_daniel', 88)
    let state = reducer(withProfile(rosterProfile(id)), {
      type: 'swipe', profileId: id, targetId: 'c_daniel', direction: 'like',
      byMatchmaker: false, score: 88,
    })
    expect(state.pending).toHaveLength(1)
    expect(state.matches).toHaveLength(0)

    state = reducer(state, { type: 'pending/resolve', now: Date.now() })
    expect(state.matches).toHaveLength(0)

    state = reducer(state, { type: 'pending/resolve', now: state.pending[0].revealAt })
    expect(state.pending).toHaveLength(0)
    expect(state.matches).toHaveLength(1)
    expect(state.notifications[0].kind).toBe('match')
  })

  it('never records the same match twice', () => {
    const id = idThatMatchesInstantly('c_daniel', 88)
    let state = withProfile(rosterProfile(id))
    const action = {
      type: 'swipe' as const, profileId: id, targetId: 'c_daniel', direction: 'like' as const,
      byMatchmaker: false, score: 88,
    }
    state = reducer(state, action)
    state = reducer(state, action)
    expect(state.matches).toHaveLength(1)
  })

  it('undoes the last swipe and the match it produced', () => {
    const id = idThatMatchesInstantly('c_daniel', 88)
    let state = reducer(withProfile(rosterProfile(id)), {
      type: 'swipe', profileId: id, targetId: 'c_daniel', direction: 'like',
      byMatchmaker: false, score: 88,
    })
    state = reducer(state, { type: 'swipe/undo', profileId: id })
    expect(state.swipes).toHaveLength(0)
    expect(state.matches).toHaveLength(0)
  })
})

describe('notifications', () => {
  it('marks everything read in one go', () => {
    const state = reducer(withProfile(rosterProfile('r_a')), { type: 'notifications/readAll' })
    expect(state.notifications.every((n) => n.read)).toBe(true)
  })
})
