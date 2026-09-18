import type { Intent, Occasion, OccasionKind, Person, Vibe } from '../types'
import { distanceBetween } from './geo'
import { pairRandom } from './id'

interface KindMeta {
  label: string
  emoji: string
  /** How much you're asking of a near-stranger by inviting them. */
  ask: 'small' | 'medium' | 'big'
  /** Interests that suggest someone would enjoy this kind of thing. */
  interests: string[]
  defaultVibe: Vibe
  /** Placeholder for the title field. */
  example: string
}

export const OCCASION_KINDS: Record<OccasionKind, KindMeta> = {
  wedding: {
    label: 'Wedding +1',
    emoji: '💒',
    ask: 'big',
    interests: ['Dancing', 'Big family', 'Travel', 'Wine', 'Live music', 'Sunday dinners'],
    defaultVibe: 'big-night',
    example: "My cousin's wedding in Rome",
  },
  'double-date': {
    label: 'Double date',
    emoji: '👯',
    ask: 'small',
    interests: ['Trying new restaurants', 'Board games', 'Karaoke', 'Live music', 'Craft beer', 'Trivia'],
    defaultVibe: 'low-key',
    example: 'Double date with me and my girlfriend',
  },
  party: {
    label: 'Party or birthday',
    emoji: '🎉',
    ask: 'medium',
    interests: ['Dancing', 'Live music', 'Karaoke', 'Craft beer', 'Concerts'],
    defaultVibe: 'big-night',
    example: "My 30th, and I'd rather not arrive alone",
  },
  family: {
    label: 'Family thing',
    emoji: '🍝',
    ask: 'big',
    interests: ['Big family', 'Sunday dinners', 'Cooking', 'Church', 'Baking'],
    defaultVibe: 'family-heavy',
    example: 'Sunday dinner at my mother\'s. Brace yourself.',
  },
  trip: {
    label: 'Trip or festival',
    emoji: '✈️',
    ask: 'big',
    interests: ['Travel', 'Road trips', 'Camping', 'Beach days', 'Hiking', 'Skiing'],
    defaultVibe: 'adventure',
    example: 'A long weekend upstate in October',
  },
  activity: {
    label: 'I have two tickets',
    emoji: '🎟️',
    ask: 'small',
    interests: ['Concerts', 'Live music', 'Theatre', 'Museums', 'Soccer', 'Basketball', 'Film', 'Stand-up comedy'],
    defaultVibe: 'low-key',
    example: 'Two tickets to a show on Friday',
  },
}

/** A fresh occasion for the editor, defaulted to a sensible double date. */
export function blankOccasion(profileId: string, city: string): Occasion {
  return {
    id: `o_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    profileId,
    kind: 'double-date',
    title: '',
    date: '',
    city,
    vibe: OCCASION_KINDS['double-date'].defaultVibe,
    details: '',
    companions: [
      { name: '', relationship: 'Me' },
      { name: '', relationship: 'My partner' },
    ],
    byMatchmaker: false,
    open: true,
    createdAt: Date.now(),
  }
}

export const VIBES: Record<Vibe, { label: string; energy: number; blurb: string }> = {
  'low-key': { label: 'Low-key', energy: 2, blurb: 'A few people, easy conversation' },
  'big-night': { label: 'Big night out', energy: 5, blurb: 'Loud, late, lots of people' },
  'family-heavy': { label: 'Family everywhere', energy: 3, blurb: 'Relatives, questions, second helpings' },
  adventure: { label: 'Adventure', energy: 4, blurb: 'Out of town, off the schedule' },
}

const INTENT_SERIOUSNESS: Record<Intent, number> = {
  'long-term': 1,
  'long-term-open': 0.88,
  'friends-first': 0.74,
  'figuring-it-out': 0.6,
  'short-term': 0.45,
}

export interface OccasionFacet {
  label: string
  score: number
  weight: number
  detail: string
}

export interface OccasionFit {
  /** 0..100 — how well this person suits this specific occasion. */
  score: number
  facets: OccasionFacet[]
  /** Short lines to show on a card: why they'd be good for this. */
  reasons: string[]
  /** Reasons to think twice before asking. */
  warnings: string[]
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

const WEIGHTS = { travel: 30, vibe: 25, interests: 25, ask: 20 } as const

/** How well `candidate` suits `occasion`, with the reasoning shown. Pure. */
export function occasionFit(occasion: Occasion, host: Person, candidate: Person): OccasionFit {
  const meta = OCCASION_KINDS[occasion.kind]
  const vibe = VIBES[occasion.vibe]
  const reasons: string[] = []
  const warnings: string[] = []

  // Can they actually get there?
  const km = distanceBetween(candidate.city, occasion.city)
  let travel: number
  let travelDetail: string
  if (candidate.city.trim().toLowerCase() === occasion.city.trim().toLowerCase()) {
    travel = 1
    travelDetail = `Already in ${occasion.city}`
    reasons.push(`Lives in ${occasion.city}`)
  } else if (km !== null) {
    travel = clamp01(1 - km / Math.max(candidate.maxDistanceKm * 2.5, 80))
    travelDetail = `${km} km from ${occasion.city}`
    if (km > candidate.maxDistanceKm * 2) {
      warnings.push(`${occasion.city} is a long way from ${candidate.city}`)
    }
    if (km > 400 && candidate.interests.includes('Travel')) {
      travel = clamp01(travel + 0.3)
      reasons.push('Travels happily, so distance is less of a problem')
    }
  } else {
    travel = 0.5
    travelDetail = `${candidate.city} → ${occasion.city}`
  }

  // Will they enjoy the room?
  const energyGap = Math.abs(candidate.lifestyle.socialEnergy - vibe.energy)
  const vibeScore = clamp01(1 - energyGap / 4)
  let vibeDetail = `${vibe.label.toLowerCase()} · ${describeEnergy(candidate)}`
  if (energyGap <= 1) {
    reasons.push(`${vibe.label} suits them`)
  } else if (energyGap >= 3) {
    warnings.push(
      vibe.energy > candidate.lifestyle.socialEnergy
        ? 'They are a homebody and this is a lot of people'
        : 'They like a big night and this is a quiet one',
    )
    vibeDetail += ' — a stretch'
  }

  // Is this their sort of thing?
  const shared = candidate.interests.filter((i) => meta.interests.includes(i))
  const interestScore = clamp01(shared.length / 2.5)
  const interestDetail = shared.length
    ? `Into ${shared.slice(0, 3).join(', ').toLowerCase()}`
    : `Nothing on their profile says ${meta.label.toLowerCase()}`
  if (shared.length >= 2) reasons.push(`Into ${shared.slice(0, 2).join(' and ').toLowerCase()}`)

  // Is this too big an ask for where they're at?
  const seriousness = INTENT_SERIOUSNESS[candidate.intent]
  let ask: number
  let askDetail: string
  if (meta.ask === 'small') {
    ask = clamp01(0.75 + seriousness * 0.25)
    askDetail = 'An easy yes for most people'
  } else if (meta.ask === 'medium') {
    ask = clamp01(0.45 + seriousness * 0.55)
    askDetail = 'A real invitation, but not a huge one'
  } else {
    ask = seriousness
    askDetail = `A ${meta.label.toLowerCase()} is a big ask`
    if (seriousness <= 0.6) {
      warnings.push(`They're here for something casual — ${meta.label.toLowerCase()} may scare them off`)
    }
  }

  // Wanting the same thing counts for a lot.
  let bonus = 0
  if (candidate.seeking?.kind === occasion.kind) {
    bonus = 10
    reasons.unshift(`They're looking for the same thing: ${candidate.seeking.note}`)
  }

  const facets: OccasionFacet[] = [
    { label: 'Getting there', score: travel, weight: WEIGHTS.travel, detail: travelDetail },
    { label: 'The vibe', score: vibeScore, weight: WEIGHTS.vibe, detail: vibeDetail },
    { label: 'Their kind of thing', score: interestScore, weight: WEIGHTS.interests, detail: interestDetail },
    { label: 'Size of the ask', score: ask, weight: WEIGHTS.ask, detail: askDetail },
  ]

  const total = facets.reduce((sum, f) => sum + f.score * f.weight, 0) + bonus
  void host
  return {
    score: Math.round(Math.max(0, Math.min(100, total))),
    facets,
    reasons: reasons.slice(0, 3),
    warnings: warnings.slice(0, 2),
  }
}

function describeEnergy(person: Person): string {
  const labels = ['happy homebody', 'small circle', 'balanced', 'usually out', 'social butterfly']
  return labels[person.lifestyle.socialEnergy - 1]
}

/** General compatibility and occasion fit, weighted into the number on the card. */
export function blendScore(compatibility: number, fit: number): number {
  return Math.round(compatibility * 0.6 + fit * 0.4)
}

export function fitLabel(score: number): string {
  if (score >= 82) return 'Made for it'
  if (score >= 66) return 'Good shout'
  if (score >= 48) return 'Could work'
  return 'A stretch'
}

const DECLINES = [
  "Can't make that weekend — already committed.",
  'Flattered, but that feels like a lot for a first meeting.',
  "I'm away that week. Ask me about something sooner?",
  'Weddings with someone I have not met yet — I would rather start smaller.',
  "That's not really my scene, but thank you for thinking of me.",
  'Work has me that weekend. Genuinely sorry.',
]

const ACCEPTS = [
  "I'm in. What's the dress code?",
  'Yes — I was looking for an excuse to get out of the house.',
  "Absolutely. I'll behave in front of the family. Mostly.",
  'Say less. Send me the address.',
  "Yes, and I'm bringing my A material.",
  "I'd love to. This is the best invitation I've had all year.",
]

/**
 * Whether an invitation is accepted, and when the answer lands. Deterministic
 * per invitation, so the world doesn't re-roll on reload.
 */
export function decideInvite(profileId: string, targetId: string, occasionId: string, score: number) {
  const seed = `${occasionId}`
  const roll = pairRandom(profileId, targetId, `invite-${seed}`)
  // Even a perfect fit says no sometimes — that's the fun of asking.
  const probability = Math.min(0.9, 0.12 + Math.pow(score / 100, 1.4) * 0.85)
  const accepted = roll < probability

  const pick = pairRandom(profileId, targetId, `reply-${seed}`)
  const lines = accepted ? ACCEPTS : DECLINES
  const reply = lines[Math.floor(pick * lines.length) % lines.length]

  const wait = pairRandom(profileId, targetId, `invite-wait-${seed}`)
  // Answering an invitation takes a beat longer than swiping right.
  const delayMs = Math.round(4000 + wait * 30000)
  return { accepted, reply, delayMs }
}

/** "in 24 days", "this Saturday", "today". */
export function whenLabel(date: string, now = Date.now()): string {
  if (!date) return 'No date set'
  const target = new Date(`${date}T12:00:00`).getTime()
  if (Number.isNaN(target)) return date
  const days = Math.round((target - now) / 86_400_000)
  if (days < -1) return `${Math.abs(days)} days ago`
  if (days === -1) return 'Yesterday'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 7) return `In ${days} days`
  if (days < 14) return 'Next week'
  if (days < 60) return `In ${Math.round(days / 7)} weeks`
  return new Date(target).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
}

/** One line describing who else is coming. */
export function companionLine(occasion: Occasion): string {
  const others = occasion.companions.filter((c) => c.name.trim())
  if (!others.length) return ''
  const parts = others.map((c) => `${c.name}${c.relationship ? ` (${c.relationship.toLowerCase()})` : ''}`)
  if (parts.length === 1) return `Also coming: ${parts[0]}`
  return `Also coming: ${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}
