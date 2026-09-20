import { describe, expect, it } from 'vitest'
import { areConnected, connectionsFor, makeConnection, otherSide, searchPeople } from './connections'
import { emptyState } from './storage'
import { makePerson } from './people'
import type { AppState, Person } from '../types'

function stateWith(people: Person[] = []): AppState {
  const base = emptyState()
  return {
    ...base,
    people: { ...base.people, ...Object.fromEntries(people.map((p) => [p.id, p])) },
    accountIds: people.map((p) => p.id),
    currentAccountId: people[0]?.id ?? null,
  }
}

const maya = makePerson({
  id: 'r_maya_t', name: 'Maya', age: 30, gender: 'woman', city: 'Brooklyn, NY',
  job: 'ICU nurse', interests: ['Cooking'],
  managed: { kind: 'other', relationship: 'My sister', pitch: '', consented: true },
})

describe('the social graph', () => {
  it('reads the same link from either side', () => {
    const link = makeConnection('a', 'b', 'family', 'Cousins')
    expect(otherSide(link, 'a')).toBe('b')
    expect(otherSide(link, 'b')).toBe('a')
  })

  it('lists a person\'s family and friends separately', () => {
    const state = stateWith()
    const family = connectionsFor(state, 'c_marcus', 'family')
    const friends = connectionsFor(state, 'c_marcus', 'friend')
    expect(family.map((f) => f.person.id)).toContain('c_malik')
    expect(friends.map((f) => f.person.id)).toContain('c_amara')
    expect(family.every((f) => f.connection.kind === 'family')).toBe(true)
  })

  it('shows the link on both profiles from one record', () => {
    const state = stateWith()
    expect(connectionsFor(state, 'c_malik', 'family').map((f) => f.person.id)).toContain('c_marcus')
    expect(areConnected(state, 'c_marcus', 'c_malik')).toBe(true)
    expect(areConnected(state, 'c_marcus', 'c_tessa')).toBe(false)
  })

  it('ships a community graph before any sample family is loaded', () => {
    expect(emptyState().connections.length).toBeGreaterThan(10)
  })
})

describe('searchPeople', () => {
  it('puts a match at the start of a name above one in the middle', () => {
    const results = searchPeople(stateWith(), 'ma')
    const names = results.map((p) => p.name)
    expect(names[0]?.toLowerCase().startsWith('ma')).toBe(true)
    expect(names).toContain('Amara')
    expect(names.indexOf('Marcus')).toBeLessThan(names.indexOf('Amara'))
  })

  it('also finds people by city, work and interest', () => {
    const state = stateWith()
    expect(searchPeople(state, 'chicago').map((p) => p.name)).toContain('Ben')
    expect(searchPeople(state, 'nurse').map((p) => p.name)).toContain('Elena')
    expect(searchPeople(state, 'climbing').map((p) => p.name)).toContain('Priya')
  })

  it('leaves out the person being added to, and anyone already linked', () => {
    const state = stateWith([maya])
    const withLink: AppState = {
      ...state,
      connections: [...state.connections, makeConnection(maya.id, 'c_daniel', 'friend', 'Friends')],
    }
    const ids = searchPeople(withLink, '', {
      excludeId: maya.id,
      excludeConnectedTo: maya.id,
    }).map((p) => p.id)
    expect(ids).not.toContain(maya.id)
    expect(ids).not.toContain('c_daniel')
  })

  it('returns everyone alphabetically when the box is empty', () => {
    const results = searchPeople(stateWith(), '   ', { limit: 5 })
    expect(results).toHaveLength(5)
    expect([...results].sort((a, b) => a.name.localeCompare(b.name))).toEqual(results)
  })

  it('finds nothing for a query nobody matches', () => {
    expect(searchPeople(stateWith(), 'zzzzz')).toEqual([])
  })
})
