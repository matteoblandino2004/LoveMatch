import type { AppState, Connection, Person, Tie } from '../types'
import { uid } from './id'

/** Labels that read the same from either side of the link. */
export const TIE_SUGGESTIONS: Record<Tie, string[]> = {
  family: [
    'Siblings', 'Cousins', 'Parent and child', 'In-laws', 'Aunt and nephew',
    'Uncle and niece', 'Step-siblings', 'Family',
  ],
  friend: [
    'Best friends', 'College friends', 'Childhood friends', 'Work friends',
    'Roommates', 'Gym friends', 'Neighbours', 'Friends',
  ],
}

export const TIE_LABELS: Record<Tie, string> = { family: 'Family', friend: 'Friends' }

/** The person on the other end of a link. */
export function otherSide(connection: Connection, personId: string): string {
  return connection.aId === personId ? connection.bId : connection.aId
}

export function involves(connection: Connection, personId: string): boolean {
  return connection.aId === personId || connection.bId === personId
}

export interface Linked {
  connection: Connection
  person: Person
}

/** Everyone linked to this person, of one kind or all kinds. */
export function connectionsFor(state: AppState, personId: string, kind?: Tie): Linked[] {
  return state.connections
    .filter((c) => involves(c, personId) && (!kind || c.kind === kind))
    .map((connection) => ({ connection, person: state.people[otherSide(connection, personId)] }))
    .filter((entry): entry is Linked => entry.person !== undefined)
    .sort((a, b) => a.person.name.localeCompare(b.person.name))
}

export function areConnected(state: AppState, aId: string, bId: string): boolean {
  return state.connections.some((c) => involves(c, aId) && involves(c, bId))
}

export function makeConnection(aId: string, bId: string, kind: Tie, label: string): Connection {
  return { id: uid('cx_'), aId, bId, kind, label: label.trim(), createdAt: Date.now() }
}

export interface SearchOptions {
  /** Never return this person. */
  excludeId?: string
  /** Leave out anyone already linked to this person. */
  excludeConnectedTo?: string
  limit?: number
}

/**
 * Find people by name, city, work or interests. Name matches rank first, and a
 * match on the start of a name beats one in the middle, so typing "ma" puts
 * Maya above Amara.
 */
export function searchPeople(state: AppState, query: string, options: SearchOptions = {}): Person[] {
  const { excludeId, excludeConnectedTo, limit = 30 } = options
  const q = query.trim().toLowerCase()

  const candidates = Object.values(state.people).filter((person) => {
    if (person.id === excludeId) return false
    if (excludeConnectedTo && person.id === excludeConnectedTo) return false
    if (excludeConnectedTo && areConnected(state, person.id, excludeConnectedTo)) return false
    return true
  })

  if (!q) {
    return candidates.sort((a, b) => a.name.localeCompare(b.name)).slice(0, limit)
  }

  const scored: { person: Person; rank: number }[] = []
  for (const person of candidates) {
    const name = person.name.toLowerCase()
    let rank = -1
    if (name.startsWith(q)) rank = 0
    else if (name.includes(q)) rank = 1
    else if (person.city.toLowerCase().includes(q)) rank = 2
    else if (person.job.toLowerCase().includes(q)) rank = 3
    else if (person.interests.some((i) => i.toLowerCase().includes(q))) rank = 4
    else if (person.hometown.toLowerCase().includes(q)) rank = 5
    if (rank >= 0) scored.push({ person, rank })
  }

  return scored
    .sort((a, b) => a.rank - b.rank || a.person.name.localeCompare(b.person.name))
    .slice(0, limit)
    .map((entry) => entry.person)
}
