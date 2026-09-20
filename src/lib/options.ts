import type { Gender, Intent, KidsStance, PetStance, Politics, Frequency } from '../types'

export const GENDER_LABELS: Record<Gender, string> = {
  woman: 'Woman',
  man: 'Man',
  nonbinary: 'Non-binary',
}

export const INTENT_LABELS: Record<Intent, string> = {
  'long-term': 'Long-term relationship',
  'long-term-open': 'Long-term, open to short',
  'short-term': 'Short-term fun',
  'friends-first': 'Friends first',
  'figuring-it-out': 'Still figuring it out',
}

export const KIDS_LABELS: Record<KidsStance, string> = {
  want: 'Wants kids',
  open: 'Open to kids',
  'dont-want': "Doesn't want kids",
  'have-want-more': 'Has kids, wants more',
  'have-done': 'Has kids, done',
}

export const PET_LABELS: Record<PetStance, string> = {
  dog: 'Dog person',
  cat: 'Cat person',
  both: 'Loves all animals',
  none: 'No pets',
  allergic: 'Allergic',
}

export const POLITICS_LABELS: Record<Politics, string> = {
  left: 'Liberal',
  moderate: 'Moderate',
  right: 'Conservative',
  apolitical: 'Not political',
}

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  never: 'Never',
  sometimes: 'Sometimes',
  often: 'Often',
}

export const SOCIAL_LABELS = [
  'Happy homebody',
  'Small circle',
  'Balanced',
  'Usually out',
  'Social butterfly',
]

export const FAITH_LABELS = [
  'Not part of my life',
  'Cultural, not practising',
  'Somewhat important',
  'Important',
  'Central to my life',
]

/** Interests, grouped so the profile editor stays browsable. */
export const INTEREST_GROUPS: { group: string; items: string[] }[] = [
  {
    group: 'Outdoors & movement',
    items: [
      'Hiking', 'Running', 'Climbing', 'Yoga', 'Surfing', 'Skiing', 'Cycling',
      'Weightlifting', 'Pickleball', 'Soccer', 'Basketball', 'Camping',
    ],
  },
  {
    group: 'Food & drink',
    items: [
      'Cooking', 'Baking', 'Coffee', 'Wine', 'Craft beer', 'Farmers markets',
      'Trying new restaurants', 'Sunday dinners', 'Grilling', 'Tea',
    ],
  },
  {
    group: 'Culture',
    items: [
      'Live music', 'Concerts', 'Museums', 'Theatre', 'Film', 'Stand-up comedy',
      'Vinyl', 'Photography', 'Painting', 'Poetry', 'Reading', 'Podcasts',
    ],
  },
  {
    group: 'Life',
    items: [
      'Travel', 'Road trips', 'Volunteering', 'Church', 'Big family', 'Dogs',
      'Cats', 'Gardening', 'Thrifting', 'Board games', 'Video games', 'Chess',
      'Karaoke', 'Dancing', 'Languages', 'Beach days', 'Astrology',
    ],
  },
  {
    group: 'Work & mind',
    items: [
      'Startups', 'Investing', 'Teaching', 'Medicine', 'Coding', 'Design',
      'Woodworking', 'DIY projects', 'Trivia', 'Meditation', 'Journaling',
    ],
  },
]

export const ALL_INTERESTS = INTEREST_GROUPS.flatMap((g) => g.items)

export const PROMPT_QUESTIONS = [
  'The way to win me over is',
  'My most irrational fear is',
  "I'll fall for you if",
  'A perfect Sunday looks like',
  'My simple pleasures are',
  "Don't hate me if I",
  'The one thing my family always says about me',
  'Two truths and a lie',
  'I geek out on',
  'My love language is',
]

export const RELATIONSHIP_SUGGESTIONS = [
  'My sister', 'My brother', 'My cousin', 'My best friend', 'My roommate',
  'My son', 'My daughter', 'My mom', 'My dad', 'My aunt', 'My uncle',
  'My coworker', 'My friend from college', 'My neighbour',
]
