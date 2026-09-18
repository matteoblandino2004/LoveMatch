import type { Gender, HairColor, Person, Preferences } from '../types'
import { uid } from './id'
import { findCity } from './geo'

type PersonDraft = Omit<Partial<Person>, 'prefs'> &
  Pick<Person, 'name' | 'age' | 'gender'> & { prefs?: Partial<Preferences> }

/** Sensible defaults so a new profile is usable before anyone edits it. */
export function defaultPreferences(age: number, over: Partial<Preferences> = {}): Preferences {
  return {
    ageMin: Math.max(18, age - 7),
    ageMax: age + 8,
    maxDistanceKm: 60,
    heightMin: 150,
    heightMax: 205,
    hair: [],
    dealbreakers: [],
    ...over,
  }
}

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
    hair: draft.hair ?? 'brown',
    bio: draft.bio ?? '',
    photos: draft.photos ?? [],
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
    prefs: defaultPreferences(draft.age, draft.prefs),
    createdAt: draft.createdAt ?? Date.now(),
    seeking: draft.seeking,
    managed: draft.managed,
    circle: draft.circle,
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
    hair: 'brown',
    accent: Math.floor(Math.random() * 360),
    managed: { kind, relationship: kind === 'self' ? 'Me' : '', pitch: '', consented: kind === 'self' },
  })
}

export const HAIR_LABELS: Record<HairColor, string> = {
  black: 'Black',
  brown: 'Brown',
  blonde: 'Blonde',
  red: 'Red',
  grey: 'Grey or silver',
  other: 'Other or shaved',
}

export function isRoster(person: Person): boolean {
  return person.managed !== undefined
}

export function displayRelationship(person: Person): string {
  if (!person.managed) return ''
  return person.managed.kind === 'self' ? 'You' : person.managed.relationship || 'Someone you love'
}
