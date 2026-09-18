/** Core domain types for LoveMatch. */

export type Gender = 'woman' | 'man' | 'nonbinary'

export type Intent =
  | 'long-term'
  | 'long-term-open'
  | 'short-term'
  | 'friends-first'
  | 'figuring-it-out'

export type Frequency = 'never' | 'sometimes' | 'often'
export type KidsStance = 'want' | 'open' | 'dont-want' | 'have-want-more' | 'have-done'
export type PetStance = 'dog' | 'cat' | 'both' | 'none' | 'allergic'
export type Politics = 'left' | 'moderate' | 'right' | 'apolitical'

export interface Lifestyle {
  drinking: Frequency
  smoking: Frequency
  exercise: Frequency
  kids: KidsStance
  pets: PetStance
  /** 1 = not part of my life, 5 = central to my life */
  faith: number
  politics: Politics
  /** 1 = happy homebody, 5 = out every night */
  socialEnergy: number
}

export interface Prompt {
  question: string
  answer: string
}

/**
 * A dating profile. Profiles you create for yourself, your sister, or your
 * college roommate are all the same shape — `managed` just records who made it.
 */
export interface Person {
  id: string
  name: string
  age: number
  pronouns: string
  gender: Gender
  interestedIn: Gender[]
  city: string
  region: string
  hometown: string
  job: string
  education: string
  heightCm: number
  bio: string
  interests: string[]
  intent: Intent
  lifestyle: Lifestyle
  prompts: Prompt[]
  /** Accent colour seed used to render the generated avatar. */
  accent: number
  ageMin: number
  ageMax: number
  maxDistanceKm: number
  createdAt: number
  /** Present when this profile lives on your roster. */
  managed?: ManagedInfo
}

export interface ManagedInfo {
  /** 'self' when it's your own profile, otherwise someone you're setting up. */
  kind: 'self' | 'other'
  /** "My sister", "Best friend since 3rd grade", ... */
  relationship: string
  /** Your pitch as the matchmaker — shown on their card and in matches. */
  pitch: string
  /** Whether the person has been told this profile exists. */
  consented: boolean
}

export type SwipeDirection = 'like' | 'pass'

export interface Swipe {
  id: string
  /** The roster profile the swipe was made on behalf of. */
  profileId: string
  targetId: string
  direction: SwipeDirection
  /** True when a matchmaker swiped instead of the person themselves. */
  byMatchmaker: boolean
  /** Optional note from the matchmaker: "you two would not stop talking". */
  note?: string
  score: number
  at: number
}

/** A like waiting to hear back. Converts to a match (or fizzles) after revealAt. */
export interface PendingLike {
  swipeId: string
  profileId: string
  targetId: string
  score: number
  byMatchmaker: boolean
  note?: string
  revealAt: number
  willMatch: boolean
}

export interface Match {
  id: string
  profileId: string
  targetId: string
  score: number
  byMatchmaker: boolean
  note?: string
  at: number
  archived: boolean
}

export type NotificationKind =
  | 'match'
  | 'matchmaker-swipe'
  | 'profile-added'
  | 'tip'

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  at: number
  read: boolean
  profileId?: string
  matchId?: string
}

export interface AppState {
  /** Whoever is holding the phone. */
  account: { name: string; createdAt: number } | null
  /** Everyone in the app: your roster plus the wider community. */
  people: Record<string, Person>
  /** Ids of the profiles you created, newest last. */
  rosterIds: string[]
  /** Ids of community profiles you can be shown. */
  communityIds: string[]
  swipes: Swipe[]
  pending: PendingLike[]
  matches: Match[]
  notifications: AppNotification[]
  /** The roster profile you're currently swiping for. */
  activeProfileId: string | null
  version: number
}
