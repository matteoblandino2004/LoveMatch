import { describe, expect, it } from 'vitest'
import { _internal } from './store'
import { emptyState } from '../lib/storage'
import { makePerson } from '../lib/people'
import { decideReciprocal } from '../lib/matchmaking'
import { decideInvite } from '../lib/occasions'
import { connectionsFor, involves } from '../lib/connections'
import { canSwipeFor, requestsAwaiting, requestsSent, swipeableFor } from '../lib/accounts'
import type { AppState, Occasion, Person } from '../types'

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

/** A state where `you` are signed in and `profile` has approved you. */
function withProfile(profile: Person): AppState {
  const me = makePerson({
    id: 'me', name: 'You', age: 32, gender: 'man',
    managed: { kind: 'self', relationship: 'Me', pitch: '', consented: true },
  })
  let state = reducer(emptyState(), { type: 'account/create', person: me })
  state = reducer(state, { type: 'profile/save', person: profile })
  if (profile.id !== me.id) {
    state = reducer(state, { type: 'grant/request', ownerId: profile.id, wingmanId: me.id })
    const grant = state.grants.find((g) => g.ownerId === profile.id)!
    state = reducer(state, { type: 'grant/respond', id: grant.id, status: 'approved' })
  }
  return { ...state, activeProfileId: profile.id }
}

describe('profiles', () => {
  it('adds a profile to the roster, makes it active and announces it', () => {
    const state = withProfile(rosterProfile('r_a'))
    expect(state.accountIds).toContain('r_a')
    expect(state.activeProfileId).toBe('r_a')
    expect(state.notifications.some((n) => n.kind === 'profile-added')).toBe(true)
  })

  it('edits in place without duplicating or re-announcing', () => {
    const first = withProfile(rosterProfile('r_a'))
    const edited = reducer(first, {
      type: 'profile/save',
      person: { ...first.people.r_a, name: 'Maya Rose' },
    })
    expect(edited.accountIds).toEqual(first.accountIds)
    expect(edited.people.r_a.name).toBe('Maya Rose')
    expect(edited.notifications).toHaveLength(first.notifications.length)
  })

  it('supports an unlimited roster', () => {
    let state = emptyState()
    for (let i = 0; i < 25; i++) {
      state = reducer(state, { type: 'profile/save', person: rosterProfile(`r_${i}`) })
    }
    expect(state.accountIds.filter((id) => id.startsWith('r_'))).toHaveLength(25)
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
    expect(state.accountIds).not.toContain(id)
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

function occasionFor(profileId: string, id = 'o_test'): Occasion {
  return {
    id,
    profileId,
    kind: 'double-date',
    title: 'Double date with me and Gabi',
    date: '',
    city: 'Brooklyn, NY',
    vibe: 'low-key',
    details: '',
    companions: [{ name: 'Gabi', relationship: 'My girlfriend' }],
    byMatchmaker: true,
    open: true,
    createdAt: Date.now(),
  }
}

/** Find a profile id whose invitation to `targetId` is accepted (or refused). */
function idWithAnswer(targetId: string, occasionId: string, score: number, want: boolean): string {
  for (let i = 0; i < 4000; i++) {
    const id = `r_${i}`
    if (decideInvite(id, targetId, occasionId, score).accepted === want) return id
  }
  throw new Error('no such id found')
}

describe('occasions', () => {
  it('announces a new occasion and lists it', () => {
    const base = withProfile(rosterProfile('r_a'))
    const state = reducer(base, { type: 'occasion/save', occasion: occasionFor('r_a') })
    expect(state.occasions).toHaveLength(1)
    expect(state.notifications[0].kind).toBe('occasion')
    expect(state.notifications[0].body).toContain('Double date')
    expect(state.notifications[0].body).toContain('Double date')
  })

  it('edits in place without announcing again', () => {
    let state = reducer(withProfile(rosterProfile('r_a')), {
      type: 'occasion/save',
      occasion: occasionFor('r_a'),
    })
    const before = state.notifications.length
    state = reducer(state, {
      type: 'occasion/save',
      occasion: { ...occasionFor('r_a'), title: 'Dinner with me and Gabi' },
    })
    expect(state.occasions).toHaveLength(1)
    expect(state.occasions[0].title).toBe('Dinner with me and Gabi')
    expect(state.notifications).toHaveLength(before)
  })

  it('takes its invitations with it when removed', () => {
    let state = reducer(withProfile(rosterProfile('r_a')), {
      type: 'occasion/save',
      occasion: occasionFor('r_a'),
    })
    state = reducer(state, {
      type: 'invite/send', occasionId: 'o_test', profileId: 'r_a', targetId: 'c_daniel',
      score: 80, fit: 75, byMatchmaker: true,
    })
    expect(state.invites).toHaveLength(1)
    state = reducer(state, { type: 'occasion/remove', id: 'o_test' })
    expect(state.occasions).toHaveLength(0)
    expect(state.invites).toHaveLength(0)
  })
})

describe('invitations', () => {
  it('sends one invitation per person and notifies that it went out', () => {
    let state = reducer(withProfile(rosterProfile('r_a')), {
      type: 'occasion/save', occasion: occasionFor('r_a'),
    })
    const send = {
      type: 'invite/send' as const, occasionId: 'o_test', profileId: 'r_a', targetId: 'c_daniel',
      score: 80, fit: 75, byMatchmaker: true, note: 'He is quiet for ten minutes then hilarious.',
    }
    state = reducer(state, send)
    state = reducer(state, send)
    expect(state.invites).toHaveLength(1)
    expect(state.invites[0].status).toBe('pending')
    expect(state.notifications[0].kind).toBe('invite')
    expect(state.notifications[0].body).toContain('hilarious')
  })

  it('ignores an invitation to an occasion that does not exist', () => {
    const state = reducer(withProfile(rosterProfile('r_a')), {
      type: 'invite/send', occasionId: 'nope', profileId: 'r_a', targetId: 'c_daniel',
      score: 80, fit: 75, byMatchmaker: true,
    })
    expect(state.invites).toHaveLength(0)
  })

  it('reveals a yes, closes the occasion and says so', () => {
    const id = idWithAnswer('c_daniel', 'o_test', 88, true)
    let state = reducer(withProfile(rosterProfile(id)), {
      type: 'occasion/save', occasion: occasionFor(id),
    })
    state = reducer(state, {
      type: 'invite/send', occasionId: 'o_test', profileId: id, targetId: 'c_daniel',
      score: 88, fit: 80, byMatchmaker: true,
    })
    const invite = state.invites[0]
    expect(state.occasions[0].open).toBe(true)

    state = reducer(state, { type: 'pending/resolve', now: invite.revealAt })
    expect(state.invites[0].status).toBe('accepted')
    expect(state.occasions[0].open).toBe(false)
    expect(state.notifications[0].kind).toBe('invite-accepted')
    expect(state.notifications[0].title).toContain('said yes')
  })

  it('reveals a no without closing the occasion', () => {
    const id = idWithAnswer('c_daniel', 'o_test', 30, false)
    let state = reducer(withProfile(rosterProfile(id)), {
      type: 'occasion/save', occasion: occasionFor(id),
    })
    state = reducer(state, {
      type: 'invite/send', occasionId: 'o_test', profileId: id, targetId: 'c_daniel',
      score: 30, fit: 25, byMatchmaker: true,
    })
    state = reducer(state, { type: 'pending/resolve', now: state.invites[0].revealAt })
    expect(state.invites[0].status).toBe('declined')
    expect(state.invites[0].reply).toBeTruthy()
    expect(state.occasions[0].open).toBe(true)
    expect(state.notifications[0].kind).toBe('invite-declined')
  })

  it('holds the answer until the reveal time', () => {
    const id = idWithAnswer('c_daniel', 'o_test', 88, true)
    let state = reducer(withProfile(rosterProfile(id)), {
      type: 'occasion/save', occasion: occasionFor(id),
    })
    state = reducer(state, {
      type: 'invite/send', occasionId: 'o_test', profileId: id, targetId: 'c_daniel',
      score: 88, fit: 80, byMatchmaker: true,
    })
    state = reducer(state, { type: 'pending/resolve', now: Date.now() })
    expect(state.invites[0].status).toBe('pending')
  })

  it('records the swipe separately so the deck moves on', () => {
    const state = reducer(withProfile(rosterProfile('r_a')), {
      type: 'swipe/record', profileId: 'r_a', targetId: 'c_daniel', score: 80,
    })
    expect(state.swipes).toHaveLength(1)
    expect(state.matches).toHaveLength(0)
    expect(state.notifications.some((n) => n.kind === 'matchmaker-swipe')).toBe(false)
  })
})

describe('an occasion only needs one date', () => {
  /**
   * Pick invitees so the ordering is known rather than assumed: someone who
   * says yes, plus two whose answers are due after theirs.
   */
  function invitees(profileId: string, occasionId: string, score: number) {
    const pool = ['c_daniel', 'c_marcus', 'c_theo', 'c_jonah', 'c_ben', 'c_omar', 'c_luca', 'c_raj']
    const answers = pool.map((targetId) => ({
      targetId,
      ...decideInvite(profileId, targetId, occasionId, score),
    }))
    const yes = answers.filter((a) => a.accepted).sort((a, b) => a.delayMs - b.delayMs)[0]
    if (!yes) throw new Error('nobody in the pool accepts')
    const later = answers.filter((a) => a.delayMs > yes.delayMs).slice(0, 2)
    if (later.length < 2) throw new Error('not enough later answers')
    return { yes: yes.targetId, later: later.map((l) => l.targetId) }
  }

  it('withdraws the invitations still waiting once someone says yes', () => {
    const profileId = 'r_a'
    const { yes, later } = invitees(profileId, 'o_test', 88)

    let state = reducer(withProfile(rosterProfile(profileId)), {
      type: 'occasion/save', occasion: occasionFor(profileId),
    })
    for (const targetId of [yes, ...later]) {
      state = reducer(state, {
        type: 'invite/send', occasionId: 'o_test', profileId, targetId,
        score: 88, fit: 80, byMatchmaker: true,
      })
    }
    expect(state.invites).toHaveLength(3)

    // Resolving at the moment of the yes closes the whole thing out.
    const accepting = state.invites.find((i) => i.targetId === yes)!
    state = reducer(state, { type: 'pending/resolve', now: accepting.revealAt })

    const accepted = state.invites.filter((i) => i.status === 'accepted')
    expect(accepted).toHaveLength(1)
    expect(accepted[0].targetId).toBe(yes)
    expect(state.invites.filter((i) => i.status === 'pending')).toHaveLength(0)
    expect(state.occasions[0].open).toBe(false)

    for (const targetId of later) {
      const invite = state.invites.find((i) => i.targetId === targetId)!
      expect(invite.status).toBe('declined')
      expect(invite.reply).toContain('Withdrawn')
    }
    expect(state.notifications.some((n) => n.title.startsWith('Took back'))).toBe(true)
  })

  it('leaves other occasions alone when one of them fills', () => {
    const profileId = 'r_a'
    const { yes } = invitees(profileId, 'o_test', 88)
    let state = reducer(withProfile(rosterProfile(profileId)), {
      type: 'occasion/save', occasion: occasionFor(profileId),
    })
    state = reducer(state, {
      type: 'occasion/save', occasion: occasionFor(profileId, 'o_other'),
    })
    state = reducer(state, {
      type: 'invite/send', occasionId: 'o_test', profileId, targetId: yes, score: 88, fit: 80, byMatchmaker: true,
    })
    state = reducer(state, {
      type: 'invite/send', occasionId: 'o_other', profileId, targetId: 'c_gabriel', score: 70, fit: 60, byMatchmaker: true,
    })
    const accepting = state.invites.find((i) => i.occasionId === 'o_test')!
    state = reducer(state, { type: 'pending/resolve', now: accepting.revealAt })

    const other = state.invites.find((i) => i.occasionId === 'o_other')!
    expect(other.status).toBe('pending')
    expect(state.occasions.find((o) => o.id === 'o_other')!.open).toBe(true)
  })
})

describe('family and friends', () => {
  it('links two people with one record that both profiles read', () => {
    const state = reducer(withProfile(rosterProfile('r_a')), {
      type: 'connection/add', aId: 'r_a', bId: 'c_daniel', kind: 'friend', label: 'Work friends',
    })
    const added = state.connections.find((c) => involves(c, 'r_a') && involves(c, 'c_daniel'))!
    expect(added.label).toBe('Work friends')
    expect(connectionsFor(state, 'r_a', 'friend').map((l) => l.person.id)).toContain('c_daniel')
    expect(connectionsFor(state, 'c_daniel', 'friend').map((l) => l.person.id)).toContain('r_a')
  })

  it('updates the existing link instead of duplicating the pair', () => {
    let state = reducer(withProfile(rosterProfile('r_a')), {
      type: 'connection/add', aId: 'r_a', bId: 'c_daniel', kind: 'friend', label: 'Work friends',
    })
    const before = state.connections.length
    // Same pair, stated the other way round and reclassified.
    state = reducer(state, {
      type: 'connection/add', aId: 'c_daniel', bId: 'r_a', kind: 'family', label: 'Cousins',
    })
    expect(state.connections).toHaveLength(before)
    const link = state.connections.find((c) => involves(c, 'r_a') && involves(c, 'c_daniel'))!
    expect(link.kind).toBe('family')
    expect(link.label).toBe('Cousins')
  })

  it('refuses to link someone to themselves', () => {
    const base = withProfile(rosterProfile('r_a'))
    const state = reducer(base, {
      type: 'connection/add', aId: 'r_a', bId: 'r_a', kind: 'friend', label: 'Me',
    })
    expect(state.connections).toHaveLength(base.connections.length)
  })

  it('removes a link by id', () => {
    let state = reducer(withProfile(rosterProfile('r_a')), {
      type: 'connection/add', aId: 'r_a', bId: 'c_daniel', kind: 'friend', label: 'Work friends',
    })
    const added = state.connections.find((c) => involves(c, 'r_a') && involves(c, 'c_daniel'))!
    state = reducer(state, { type: 'connection/remove', id: added.id })
    expect(connectionsFor(state, 'r_a')).toHaveLength(0)
    // The rest of the community graph is untouched.
    expect(state.connections.length).toBeGreaterThan(10)
  })

  it("takes a deleted profile out of everyone elses circles", () => {
    let state = reducer(withProfile(rosterProfile('r_a')), {
      type: 'connection/add', aId: 'r_a', bId: 'c_daniel', kind: 'friend', label: 'Work friends',
    })
    state = reducer(state, { type: 'profile/remove', id: 'r_a' })
    expect(connectionsFor(state, 'c_daniel', 'friend').map((l) => l.person.id)).not.toContain('r_a')
  })

  it('loads the sample family already knowing each other', () => {
    const state = reducer(emptyState(), { type: 'seed/sample' })
    expect(connectionsFor(state, 'r_maya', 'family').map((l) => l.person.id)).toContain('r_carla')
    expect(connectionsFor(state, 'r_maya', 'friend').map((l) => l.person.id)).toContain('r_jo')
  })
})

describe('accounts and permission', () => {
  const me = () =>
    makePerson({
      id: 'me', name: 'You', age: 32, gender: 'man',
      managed: { kind: 'self', relationship: 'Me', pitch: '', consented: true },
    })

  function signedIn(): AppState {
    return reducer(emptyState(), { type: 'account/create', person: me() })
  }

  it('signs you in as your own account and starts you on your own deck', () => {
    const state = signedIn()
    expect(state.currentAccountId).toBe('me')
    expect(state.accountIds).toEqual(['me'])
    expect(state.activeProfileId).toBe('me')
  })

  it('will not let you swipe for someone who has not approved you', () => {
    let state = signedIn()
    state = reducer(state, { type: 'profile/save', person: rosterProfile('r_a') })
    state = reducer(state, { type: 'profile/setActive', id: 'r_a' })
    expect(state.activeProfileId).toBe('me')
    expect(swipeableFor(state, 'me').map((p) => p.id)).toEqual(['me'])
  })

  it('opens their deck once they approve, and shuts it when they take it back', () => {
    let state = signedIn()
    state = reducer(state, { type: 'profile/save', person: rosterProfile('r_a') })
    state = reducer(state, {
      type: 'grant/request', ownerId: 'r_a', wingmanId: 'me', message: 'let me drive',
    })
    const grant = state.grants.find((g) => g.ownerId === 'r_a')!
    expect(grant.status).toBe('pending')
    expect(canSwipeFor(state, 'me', 'r_a')).toBe(false)

    state = reducer(state, { type: 'grant/respond', id: grant.id, status: 'approved' })
    expect(canSwipeFor(state, 'me', 'r_a')).toBe(true)
    expect(swipeableFor(state, 'me').map((p) => p.id)).toEqual(['me', 'r_a'])

    state = reducer(state, { type: 'profile/setActive', id: 'r_a' })
    expect(state.activeProfileId).toBe('r_a')

    // They change their mind — you're put back on your own deck.
    state = reducer(state, { type: 'grant/revoke', id: grant.id })
    expect(canSwipeFor(state, 'me', 'r_a')).toBe(false)
    expect(state.activeProfileId).toBe('me')
  })

  it('records a decline and leaves the deck shut', () => {
    let state = signedIn()
    state = reducer(state, { type: 'profile/save', person: rosterProfile('r_a') })
    state = reducer(state, { type: 'grant/request', ownerId: 'r_a', wingmanId: 'me' })
    const grant = state.grants.find((g) => g.ownerId === 'r_a')!
    state = reducer(state, { type: 'grant/respond', id: grant.id, status: 'declined' })
    expect(canSwipeFor(state, 'me', 'r_a')).toBe(false)
    expect(state.notifications[0].kind).toBe('wingman-declined')
  })

  it('never asks on your own behalf, and never asks twice', () => {
    let state = signedIn()
    state = reducer(state, { type: 'profile/save', person: rosterProfile('r_a') })
    const before = state.grants.length
    state = reducer(state, { type: 'grant/request', ownerId: 'me', wingmanId: 'me' })
    expect(state.grants).toHaveLength(before)

    state = reducer(state, { type: 'grant/request', ownerId: 'r_a', wingmanId: 'me' })
    const after = state.grants.length
    state = reducer(state, { type: 'grant/request', ownerId: 'r_a', wingmanId: 'me' })
    expect(state.grants).toHaveLength(after)
  })

  it('lets someone not signed in here answer in their own time', () => {
    let state = signedIn()
    // c_daniel is in the community, not on this device.
    state = reducer(state, { type: 'grant/request', ownerId: 'c_daniel', wingmanId: 'me' })
    const grant = state.grants.find((g) => g.ownerId === 'c_daniel')!
    expect(grant.status).toBe('pending')
    expect(grant.revealAt).toBeGreaterThan(Date.now())

    state = reducer(state, { type: 'pending/resolve', now: Date.now() })
    expect(state.grants.find((g) => g.id === grant.id)!.status).toBe('pending')

    state = reducer(state, { type: 'pending/resolve', now: grant.revealAt! })
    const answered = state.grants.find((g) => g.id === grant.id)!
    expect(answered.status === 'approved' || answered.status === 'declined').toBe(true)
    expect(answered.reply).toBeTruthy()
  })

  it("switches accounts and puts you on that account's own deck", () => {
    let state = signedIn()
    state = reducer(state, { type: 'profile/save', person: rosterProfile('r_a') })
    state = reducer(state, { type: 'account/switch', id: 'r_a' })
    expect(state.currentAccountId).toBe('r_a')
    expect(state.activeProfileId).toBe('r_a')

    state = reducer(state, { type: 'account/switch', id: 'me' })
    expect(state.currentAccountId).toBe('me')
  })

  it('refuses to switch to an account that is not signed in here', () => {
    const state = reducer(signedIn(), { type: 'account/switch', id: 'c_daniel' })
    expect(state.currentAccountId).toBe('me')
  })

  it('keeps a request addressed to the account that has to answer it', () => {
    let state = signedIn()
    state = reducer(state, { type: 'profile/save', person: rosterProfile('r_a') })
    state = reducer(state, { type: 'grant/request', ownerId: 'r_a', wingmanId: 'me' })
    const note = state.notifications.find((n) => n.kind === 'wingman-request')!
    expect(note.audienceId).toBe('r_a')
    expect(requestsAwaiting(state, 'r_a')).toHaveLength(1)
    expect(requestsAwaiting(state, 'me')).toHaveLength(0)
    expect(requestsSent(state, 'me')).toHaveLength(1)
  })

  it('takes the permissions with a deleted account', () => {
    let state = signedIn()
    state = reducer(state, { type: 'profile/save', person: rosterProfile('r_a') })
    state = reducer(state, { type: 'grant/request', ownerId: 'r_a', wingmanId: 'me' })
    state = reducer(state, { type: 'profile/remove', id: 'r_a' })
    expect(state.grants.some((g) => g.ownerId === 'r_a')).toBe(false)
    expect(state.currentAccountId).toBe('me')
  })
})
