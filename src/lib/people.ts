import type { Gender, Person } from '../types'
import { uid } from './id'
import { findCity } from './geo'

type PersonDraft = Partial<Person> & Pick<Person, 'name' | 'age' | 'gender'>

/** Fill a partial profile out into a complete one. */
export function makePerson(draft: PersonDraft): Person {
  const city = draft.city ?? 'Brooklyn, NY'
  const region = draft.region ?? findCity(city)?.region ?? ''
  const base: Person = {
    id: draft.id ?? uid('p_'),
    name: draft.name,
    age: draft.age,
    pronouns: draft.pronouns ?? defaultPronouns(draft.gender),
    gender: draft.gender,
    interestedIn: draft.interestedIn ?? ['woman', 'man', 'nonbinary'],
    city,
    region,
    hometown: draft.hometown ?? city,
    job: draft.job ?? '',
    education: draft.education ?? '',
    heightCm: draft.heightCm ?? 170,
    bio: draft.bio ?? '',
    interests: draft.interests ?? [],
    intent: draft.intent ?? 'long-term',
    lifestyle: {
      drinking: 'sometimes',
      smoking: 'never',
      exercise: 'sometimes',
      kids: 'open',
      pets: 'both',
      faith: 2,
      politics: 'moderate',
      socialEnergy: 3,
      ...draft.lifestyle,
    },
    prompts: draft.prompts ?? [],
    accent: draft.accent ?? Math.floor(Math.random() * 360),
    ageMin: draft.ageMin ?? Math.max(18, draft.age - 7),
    ageMax: draft.ageMax ?? draft.age + 8,
    maxDistanceKm: draft.maxDistanceKm ?? 60,
    createdAt: draft.createdAt ?? Date.now(),
    managed: draft.managed,
  }
  return base
}

function defaultPronouns(gender: Gender): string {
  if (gender === 'woman') return 'she/her'
  if (gender === 'man') return 'he/him'
  return 'they/them'
}

/** A starting point for the profile editor. */
export function blankPerson(kind: 'self' | 'other'): Person {
  return makePerson({
    name: '',
    age: 28,
    gender: 'woman',
    interestedIn: ['man'],
    city: 'Brooklyn, NY',
    accent: Math.floor(Math.random() * 360),
    managed: { kind, relationship: kind === 'self' ? 'Me' : '', pitch: '', consented: kind === 'self' },
  })
}

export function isRoster(person: Person): boolean {
  return person.managed !== undefined
}

export function displayRelationship(person: Person): string {
  if (!person.managed) return ''
  return person.managed.kind === 'self' ? 'You' : person.managed.relationship || 'Someone you love'
}
