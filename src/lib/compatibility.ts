import type { Intent, KidsStance, Person, Politics } from '../types'
import { HAIR_LABELS } from './people'
import { distanceBetween } from './geo'

export interface Facet {
  key: 'interests' | 'age' | 'location' | 'intent' | 'lifestyle' | 'values' | 'type'
  label: string
  /** 0..1 */
  score: number
  /** Share of the total 100 points this facet can contribute. */
  weight: number
  /** One line of plain-English reasoning shown under the bar. */
  detail: string
}

export interface Compatibility {
  /** 0..100 */
  score: number
  facets: Facet[]
  shared: string[]
  /** Things worth knowing before you swipe: "she wants kids, he doesn't". */
  flags: string[]
  /** Openers built from what they actually have in common. */
  icebreakers: string[]
}

const WEIGHTS = {
  interests: 22,
  intent: 16,
  lifestyle: 14,
  type: 14,
  age: 12,
  location: 12,
  values: 10,
} as const

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

export function sharedInterests(a: Person, b: Person): string[] {
  const set = new Set(b.interests)
  return a.interests.filter((i) => set.has(i))
}

function scoreInterests(a: Person, b: Person): Facet {
  const shared = sharedInterests(a, b)
  const smaller = Math.max(1, Math.min(a.interests.length, b.interests.length))
  // Four things in common already says a lot, so we don't demand a perfect overlap.
  const score = clamp01((shared.length / Math.min(smaller, 5)) * 0.95)
  const detail = shared.length
    ? `${shared.length} shared: ${shared.slice(0, 4).join(', ')}${shared.length > 4 ? '…' : ''}`
    : 'Nothing overlapping yet — opposites can work'
  return { key: 'interests', label: 'Shared interests', score, weight: WEIGHTS.interests, detail }
}

function scoreAge(a: Person, b: Person): Facet {
  const gap = Math.abs(a.age - b.age)
  let score = clamp01(1 - gap / 16)
  const aOk = b.age >= a.prefs.ageMin && b.age <= a.prefs.ageMax
  const bOk = a.age >= b.prefs.ageMin && a.age <= b.prefs.ageMax
  let detail = gap === 0 ? 'Same age' : `${gap} year${gap === 1 ? '' : 's'} apart`
  if (!aOk || !bOk) {
    score = Math.min(score, 0.25)
    detail += ' — outside a stated age preference'
  }
  return { key: 'age', label: 'Age', score, weight: WEIGHTS.age, detail }
}

function scoreLocation(a: Person, b: Person): Facet {
  const km = distanceBetween(a.city, b.city)
  let score: number
  let detail: string

  if (a.city.trim().toLowerCase() === b.city.trim().toLowerCase()) {
    score = 1
    detail = `Both in ${a.city}`
  } else if (km !== null) {
    const limit = Math.min(a.prefs.maxDistanceKm, b.prefs.maxDistanceKm)
    score = clamp01(1 - km / Math.max(limit * 2.5, 60))
    detail = `${km} km apart`
    if (km > limit) {
      score = Math.min(score, 0.35)
      detail += ` — farther than they usually look (${limit} km)`
    }
  } else if (a.region && a.region === b.region) {
    score = 0.7
    detail = `Both in ${a.region}`
  } else {
    score = 0.25
    detail = `${a.city} and ${b.city}`
  }

  // Coming from the same place counts for something, even years later.
  if (a.hometown && a.hometown.trim().toLowerCase() === b.hometown.trim().toLowerCase()) {
    score = clamp01(score + 0.18)
    detail += ` · both from ${a.hometown}`
  }
  return { key: 'location', label: 'Location', score, weight: WEIGHTS.location, detail }
}

const INTENT_FIT: Record<Intent, Record<Intent, number>> = {
  'long-term': {
    'long-term': 1, 'long-term-open': 0.85, 'short-term': 0.1,
    'friends-first': 0.6, 'figuring-it-out': 0.45,
  },
  'long-term-open': {
    'long-term': 0.85, 'long-term-open': 1, 'short-term': 0.5,
    'friends-first': 0.7, 'figuring-it-out': 0.7,
  },
  'short-term': {
    'long-term': 0.1, 'long-term-open': 0.5, 'short-term': 1,
    'friends-first': 0.45, 'figuring-it-out': 0.6,
  },
  'friends-first': {
    'long-term': 0.6, 'long-term-open': 0.7, 'short-term': 0.45,
    'friends-first': 1, 'figuring-it-out': 0.75,
  },
  'figuring-it-out': {
    'long-term': 0.45, 'long-term-open': 0.7, 'short-term': 0.6,
    'friends-first': 0.75, 'figuring-it-out': 0.9,
  },
}

const INTENT_SHORT: Record<Intent, string> = {
  'long-term': 'something serious',
  'long-term-open': 'serious, but flexible',
  'short-term': 'something casual',
  'friends-first': 'friends first',
  'figuring-it-out': 'still figuring it out',
}

function scoreIntent(a: Person, b: Person): Facet {
  const score = INTENT_FIT[a.intent][b.intent]
  const detail =
    a.intent === b.intent
      ? `Both want ${INTENT_SHORT[a.intent]}`
      : `${a.name} wants ${INTENT_SHORT[a.intent]}, ${b.name} wants ${INTENT_SHORT[b.intent]}`
  return { key: 'intent', label: 'What they want', score, weight: WEIGHTS.intent, detail }
}

const KIDS_FIT: Record<KidsStance, Record<KidsStance, number>> = {
  want: { want: 1, open: 0.8, 'dont-want': 0, 'have-want-more': 0.85, 'have-done': 0.2 },
  open: { want: 0.8, open: 1, 'dont-want': 0.5, 'have-want-more': 0.75, 'have-done': 0.7 },
  'dont-want': { want: 0, open: 0.5, 'dont-want': 1, 'have-want-more': 0.05, 'have-done': 0.45 },
  'have-want-more': { want: 0.85, open: 0.75, 'dont-want': 0.05, 'have-want-more': 1, 'have-done': 0.6 },
  'have-done': { want: 0.2, open: 0.7, 'dont-want': 0.45, 'have-want-more': 0.6, 'have-done': 1 },
}

const FREQ_RANK = { never: 0, sometimes: 1, often: 2 }

function scoreLifestyle(a: Person, b: Person): Facet {
  const kids = KIDS_FIT[a.lifestyle.kids][b.lifestyle.kids]
  const drink = 1 - Math.abs(FREQ_RANK[a.lifestyle.drinking] - FREQ_RANK[b.lifestyle.drinking]) / 2
  const smoke = 1 - Math.abs(FREQ_RANK[a.lifestyle.smoking] - FREQ_RANK[b.lifestyle.smoking]) / 2
  const gym = 1 - Math.abs(FREQ_RANK[a.lifestyle.exercise] - FREQ_RANK[b.lifestyle.exercise]) / 2.5
  const pets = petFit(a, b)

  // Kids is the question that ends relationships, so it carries the most weight.
  const score = clamp01(kids * 0.45 + drink * 0.15 + smoke * 0.15 + gym * 0.1 + pets * 0.15)

  const parts: string[] = []
  if (kids >= 0.8) parts.push('aligned on kids')
  else if (kids <= 0.2) parts.push('clash on kids')
  if (smoke < 0.5) parts.push('different on smoking')
  if (drink >= 1) parts.push('same pace with drinking')
  if (pets >= 1) parts.push('same animal people')
  const detail = parts.length ? capitalize(parts.join(', ')) : 'Day-to-day habits mostly line up'
  return { key: 'lifestyle', label: 'Lifestyle', score, weight: WEIGHTS.lifestyle, detail }
}

function petFit(a: Person, b: Person): number {
  const x = a.lifestyle.pets
  const y = b.lifestyle.pets
  if (x === y) return 1
  if (x === 'allergic' || y === 'allergic') {
    const other = x === 'allergic' ? y : x
    return other === 'none' ? 0.9 : 0.2
  }
  if (x === 'both' || y === 'both') return 0.85
  if (x === 'none' || y === 'none') return 0.6
  return 0.5 // dog person, cat person
}

const POLITICS_FIT: Record<Politics, Record<Politics, number>> = {
  left: { left: 1, moderate: 0.6, right: 0.15, apolitical: 0.6 },
  moderate: { left: 0.6, moderate: 1, right: 0.6, apolitical: 0.8 },
  right: { left: 0.15, moderate: 0.6, right: 1, apolitical: 0.6 },
  apolitical: { left: 0.6, moderate: 0.8, right: 0.6, apolitical: 1 },
}

function scoreValues(a: Person, b: Person): Facet {
  const politics = POLITICS_FIT[a.lifestyle.politics][b.lifestyle.politics]
  const faithGap = Math.abs(a.lifestyle.faith - b.lifestyle.faith)
  // Two people who both centre their faith match as well as two who both don't.
  const faith = clamp01(1 - faithGap / 4)
  const energy = clamp01(1 - Math.abs(a.lifestyle.socialEnergy - b.lifestyle.socialEnergy) / 4)
  const score = clamp01(politics * 0.4 + faith * 0.3 + energy * 0.3)

  const parts: string[] = []
  if (politics >= 1) parts.push('see politics the same way')
  else if (politics <= 0.2) parts.push('far apart politically')
  if (faithGap <= 1) parts.push('similar place with faith')
  else if (faithGap >= 3) parts.push('very different about faith')
  if (energy >= 0.75) parts.push('same social battery')
  const detail = parts.length ? capitalize(parts.join(', ')) : 'Different outlooks worth talking through'
  return { key: 'values', label: 'Values & energy', score, weight: WEIGHTS.values, detail }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * How close each one is to the other's stated type — height, hair, age band.
 * Scored both ways and averaged, because wanting someone who doesn't want you
 * back isn't a match.
 */
function scoreType(a: Person, b: Person): Facet {
  const forA = matchesType(a, b)
  const forB = matchesType(b, a)
  const score = (forA.score + forB.score) / 2

  const notes: string[] = []
  if (forA.hair === 'hit') notes.push(`${b.name} has the hair ${a.name} asked for`)
  else if (forA.hair === 'miss') notes.push(`Not the hair colour ${a.name} usually picks`)
  if (forA.height === 'miss') notes.push(`Outside ${a.name}'s height range`)
  else if (forB.height === 'miss') notes.push(`Outside ${b.name}'s height range`)
  if (!notes.length) {
    notes.push(
      forA.anyPreference || forB.anyPreference
        ? 'Ticks the boxes on both sides'
        : 'Neither of them is fussy about looks',
    )
  }
  return { key: 'type', label: 'Their type', score, weight: WEIGHTS.type, detail: notes.join(' · ') }
}

type Hit = 'hit' | 'miss' | 'none'

/** Does `other` fit what `viewer` said they're looking for? */
function matchesType(viewer: Person, other: Person) {
  const parts: number[] = []

  const wantsHair = viewer.prefs.hair.length > 0
  const hair: Hit = !wantsHair ? 'none' : viewer.prefs.hair.includes(other.hair) ? 'hit' : 'miss'
  if (wantsHair) parts.push(hair === 'hit' ? 1 : 0.35)

  const { heightMin, heightMax } = viewer.prefs
  const inHeight = other.heightCm >= heightMin && other.heightCm <= heightMax
  // A preference is only meaningful if it actually rules anything out.
  const heightMatters = heightMin > 150 || heightMax < 205
  const height: Hit = !heightMatters ? 'none' : inHeight ? 'hit' : 'miss'
  if (heightMatters) {
    const over = inHeight ? 0 : Math.min(Math.abs(other.heightCm - heightMin), Math.abs(other.heightCm - heightMax))
    parts.push(inHeight ? 1 : clamp01(1 - over / 15) * 0.6)
  }

  const inAge = other.age >= viewer.prefs.ageMin && other.age <= viewer.prefs.ageMax
  parts.push(inAge ? 1 : 0.4)

  return {
    score: parts.reduce((sum, n) => sum + n, 0) / parts.length,
    hair,
    height,
    anyPreference: wantsHair || heightMatters,
  }
}

/** Hard rules — these keep someone out of the deck rather than costing points. */
export function failedDealbreakers(viewer: Person, other: Person): string[] {
  const failed: string[] = []
  for (const rule of viewer.prefs.dealbreakers) {
    if (rule === 'no-smokers' && other.lifestyle.smoking !== 'never') {
      failed.push('They smoke')
    }
    if (rule === 'must-want-kids' && !['want', 'open', 'have-want-more'].includes(other.lifestyle.kids)) {
      failed.push("They don't want kids")
    }
    if (rule === 'must-not-want-kids' && ['want', 'have-want-more'].includes(other.lifestyle.kids)) {
      failed.push('They want kids')
    }
    if (rule === 'no-one-with-kids' && ['have-want-more', 'have-done'].includes(other.lifestyle.kids)) {
      failed.push('They already have kids')
    }
    if (rule === 'nearby-only') {
      const km = distanceBetween(viewer.city, other.city)
      if (km !== null && km > viewer.prefs.maxDistanceKm) failed.push(`${km} km away`)
      if (km === null && viewer.region !== other.region) failed.push('Not nearby')
    }
  }
  return failed
}

/** Open to each other's gender, and past each other's hard rules. */
export function eligibleFor(viewer: Person, other: Person): boolean {
  return mutuallyEligible(viewer, other) && failedDealbreakers(viewer, other).length === 0
}

function buildFlags(a: Person, b: Person, facets: Facet[]): string[] {
  const flags: string[] = []
  const kids = KIDS_FIT[a.lifestyle.kids][b.lifestyle.kids]
  if (kids <= 0.2) flags.push('They want different things about kids')
  if (facets.find((f) => f.key === 'intent')!.score <= 0.3) {
    flags.push('One wants serious, the other does not')
  }
  const loc = facets.find((f) => f.key === 'location')!
  if (loc.score <= 0.35) flags.push('This would start as long distance')
  if (a.lifestyle.smoking !== b.lifestyle.smoking && (a.lifestyle.smoking === 'often' || b.lifestyle.smoking === 'often')) {
    flags.push('One of them smokes regularly')
  }
  if (!a.interestedIn.includes(b.gender) || !b.interestedIn.includes(a.gender)) {
    flags.push('Outside their stated preferences')
  }
  for (const reason of failedDealbreakers(a, b)) {
    flags.push(`${a.name} ruled this out: ${reason.toLowerCase()}`)
  }
  return flags
}

function buildIcebreakers(a: Person, b: Person, shared: string[]): string[] {
  const out: string[] = []
  if (shared[0]) out.push(`Ask about ${shared[0].toLowerCase()} — you're both into it.`)
  if (shared[1]) out.push(`"Best ${shared[1].toLowerCase()} spot you've found around here?"`)
  if (a.hometown && a.hometown === b.hometown) {
    out.push(`You're both from ${a.hometown}. Start there.`)
  }
  const prompt = b.prompts[0]
  if (prompt) out.push(`Answer their prompt back: "${prompt.question}"`)
  if (a.lifestyle.kids === b.lifestyle.kids && a.lifestyle.kids === 'want') {
    out.push('You both want a family one day — no need to dance around it.')
  }
  if (!out.length) out.push('You have little in common on paper. Ask what they do on a day off.')
  return out.slice(0, 3)
}

/** Score how well two people fit, with the reasoning shown. Symmetric-ish and pure. */
export function compatibility(a: Person, b: Person): Compatibility {
  const facets: Facet[] = [
    scoreInterests(a, b),
    scoreIntent(a, b),
    scoreLifestyle(a, b),
    scoreAge(a, b),
    scoreLocation(a, b),
    scoreValues(a, b),
    scoreType(a, b),
  ]
  const total = facets.reduce((sum, f) => sum + f.score * f.weight, 0)
  const shared = sharedInterests(a, b)
  return {
    score: Math.round(total),
    facets,
    shared,
    flags: buildFlags(a, b, facets),
    icebreakers: buildIcebreakers(a, b, shared),
  }
}

/** "Brown or black hair, 175-195 cm, 28-38" — one line of what they're after. */
export function describePreferences(person: Person): string {
  const bits: string[] = [`${person.prefs.ageMin}-${person.prefs.ageMax}`]
  if (person.prefs.heightMin > 150 || person.prefs.heightMax < 205) {
    bits.push(`${person.prefs.heightMin}-${person.prefs.heightMax} cm`)
  }
  if (person.prefs.hair.length) {
    bits.push(`${person.prefs.hair.map((h) => HAIR_LABELS[h].toLowerCase()).join(' or ')} hair`)
  }
  bits.push(`within ${person.prefs.maxDistanceKm} km`)
  return bits.join(' · ')
}

export function scoreLabel(score: number): string {
  if (score >= 85) return 'Rare match'
  if (score >= 72) return 'Strong fit'
  if (score >= 58) return 'Promising'
  if (score >= 42) return 'Worth a shot'
  return 'Long shot'
}

/** Whether each person is open to the other's gender. Used to filter the deck. */
export function mutuallyEligible(a: Person, b: Person): boolean {
  return a.interestedIn.includes(b.gender) && b.interestedIn.includes(a.gender)
}
