import { describe, expect, it } from 'vitest'
import {
  compatibility, describePreferences, eligibleFor, failedDealbreakers, mutuallyEligible,
  scoreLabel, sharedInterests,
} from './compatibility'
import { makePerson } from './people'
import type { Person } from '../types'

type Draft = Omit<Partial<Person>, 'prefs'> & { name: string; prefs?: Partial<Person['prefs']> }

function person(over: Draft): Person {
  return makePerson({
    age: 30,
    gender: 'woman',
    interestedIn: ['man', 'woman', 'nonbinary'],
    city: 'Brooklyn, NY',
    interests: ['Cooking', 'Hiking', 'Live music', 'Dogs'],
    intent: 'long-term',
    ...over,
  })
}

describe('compatibility', () => {
  it('scores a well-aligned pair far above a mismatched one', () => {
    const a = person({ name: 'A' })
    const twin = person({ name: 'B', gender: 'man' })
    const opposite = person({
      name: 'C',
      gender: 'man',
      age: 52,
      city: 'Sydney, AU',
      interests: ['Chess', 'Investing'],
      intent: 'short-term',
      lifestyle: {
        drinking: 'often', smoking: 'often', exercise: 'never', kids: 'dont-want',
        pets: 'allergic', faith: 5, politics: 'right', socialEnergy: 5,
      },
    })
    expect(compatibility(a, twin).score).toBeGreaterThan(85)
    expect(compatibility(a, opposite).score).toBeLessThan(35)
  })

  it('keeps every score inside 0..100', () => {
    const a = person({ name: 'A' })
    const b = person({ name: 'B', age: 99, city: 'Manila, PH', interests: [] })
    const score = compatibility(a, b).score
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('weights the six facets to exactly 100 points', () => {
    const total = compatibility(person({ name: 'A' }), person({ name: 'B' })).facets.reduce(
      (sum, f) => sum + f.weight,
      0,
    )
    expect(total).toBe(100)
  })

  it('flags a hard disagreement about kids', () => {
    const a = person({ name: 'A', lifestyle: { ...person({ name: 'A' }).lifestyle, kids: 'want' } })
    const b = person({
      name: 'B',
      gender: 'man',
      lifestyle: { ...person({ name: 'B' }).lifestyle, kids: 'dont-want' },
    })
    expect(compatibility(a, b).flags).toContain('They want different things about kids')
  })

  it('penalises someone outside a stated age preference', () => {
    const a = person({ name: 'A', prefs: { ageMin: 28, ageMax: 34 } })
    const inRange = person({ name: 'B', gender: 'man', age: 32 })
    const outOfRange = person({ name: 'C', gender: 'man', age: 44, prefs: { ageMin: 20, ageMax: 60 } })
    const facet = (p: Person) => compatibility(a, p).facets.find((f) => f.key === 'age')!
    expect(facet(inRange).score).toBeGreaterThan(facet(outOfRange).score)
    expect(facet(outOfRange).detail).toContain('age preference')
  })

  it('rewards living in the same city over being across the world', () => {
    const a = person({ name: 'A', city: 'Brooklyn, NY' })
    const near = person({ name: 'B', gender: 'man', city: 'Brooklyn, NY' })
    const far = person({ name: 'C', gender: 'man', city: 'Seoul, KR' })
    const loc = (p: Person) => compatibility(a, p).facets.find((f) => f.key === 'location')!.score
    expect(loc(near)).toBe(1)
    expect(loc(far)).toBeLessThan(0.4)
  })

  it('counts shared interests and offers openers built from them', () => {
    const a = person({ name: 'A' })
    const b = person({ name: 'B', gender: 'man', interests: ['Cooking', 'Dogs', 'Chess'] })
    expect(sharedInterests(a, b)).toEqual(['Cooking', 'Dogs'])
    expect(compatibility(a, b).icebreakers[0]).toContain('cooking')
  })

  it('is symmetric on the total score', () => {
    const a = person({ name: 'A' })
    const b = person({ name: 'B', gender: 'man', age: 35, city: 'Boston, MA' })
    expect(compatibility(a, b).score).toBe(compatibility(b, a).score)
  })
})

describe('mutuallyEligible', () => {
  it('requires both sides to be open to the other', () => {
    const a = person({ name: 'A', gender: 'woman', interestedIn: ['man'] })
    const yes = person({ name: 'B', gender: 'man', interestedIn: ['woman'] })
    const no = person({ name: 'C', gender: 'man', interestedIn: ['man'] })
    expect(mutuallyEligible(a, yes)).toBe(true)
    expect(mutuallyEligible(a, no)).toBe(false)
  })
})

describe('scoreLabel', () => {
  it('reads plainly across the range', () => {
    expect(scoreLabel(92)).toBe('Rare match')
    expect(scoreLabel(60)).toBe('Promising')
    expect(scoreLabel(12)).toBe('Long shot')
  })
})

describe('their type', () => {
  const typeFacet = (a: Person, b: Person) =>
    compatibility(a, b).facets.find((f) => f.key === 'type')!

  it('scores a person inside both stated types above one outside them', () => {
    const a = person({
      name: 'A',
      prefs: { heightMin: 178, heightMax: 200, hair: ['black', 'brown'] },
    })
    const onType = person({ name: 'B', gender: 'man', heightCm: 185, hair: 'black' })
    const offType = person({ name: 'C', gender: 'man', heightCm: 162, hair: 'blonde' })
    expect(typeFacet(a, onType).score).toBeGreaterThan(typeFacet(a, offType).score)
  })

  it('ignores height when the range is left wide open', () => {
    const fussy = person({ name: 'A', prefs: { heightMin: 185, heightMax: 200 } })
    const open = person({ name: 'A', prefs: { heightMin: 140, heightMax: 210 } })
    const short = person({ name: 'B', gender: 'man', heightCm: 160 })
    expect(typeFacet(open, short).score).toBeGreaterThan(typeFacet(fussy, short).score)
    expect(typeFacet(open, short).detail).toContain('fussy')
  })

  it('treats hair as a preference, not a rule', () => {
    const a = person({ name: 'A', prefs: { hair: ['red'] } })
    const wrongHair = person({ name: 'B', gender: 'man', hair: 'black' })
    expect(typeFacet(a, wrongHair).score).toBeGreaterThan(0)
    expect(mutuallyEligible(a, wrongHair)).toBe(true)
  })

  it('counts both directions, so a one-sided type is not a full match', () => {
    const a = person({ name: 'A', heightCm: 160, prefs: { hair: ['black'] } })
    const oneWay = person({
      name: 'B', gender: 'man', hair: 'black',
      prefs: { heightMin: 175, heightMax: 200 },
    })
    expect(typeFacet(a, oneWay).score).toBeLessThan(1)
  })

  it('still weights the facets to exactly 100', () => {
    const total = compatibility(person({ name: 'A' }), person({ name: 'B' })).facets.reduce(
      (sum, f) => sum + f.weight,
      0,
    )
    expect(total).toBe(100)
  })
})

describe('dealbreakers', () => {
  const smoker = () =>
    person({
      name: 'S', gender: 'man',
      lifestyle: { ...person({ name: 'x' }).lifestyle, smoking: 'often' },
    })

  it('rules out a smoker only when the rule is set', () => {
    const relaxed = person({ name: 'A' })
    const strict = person({ name: 'A', prefs: { dealbreakers: ['no-smokers'] } })
    expect(eligibleFor(relaxed, smoker())).toBe(true)
    expect(eligibleFor(strict, smoker())).toBe(false)
    expect(failedDealbreakers(strict, smoker())).toEqual(['They smoke'])
  })

  it('rules out someone who does not want kids', () => {
    const wants = person({ name: 'A', prefs: { dealbreakers: ['must-want-kids'] } })
    const childfree = person({
      name: 'B', gender: 'man',
      lifestyle: { ...person({ name: 'x' }).lifestyle, kids: 'dont-want' },
    })
    expect(eligibleFor(wants, childfree)).toBe(false)
    expect(failedDealbreakers(wants, childfree)[0]).toContain("don't want kids")
  })

  it('rules out existing parents when asked to', () => {
    const noKids = person({ name: 'A', prefs: { dealbreakers: ['no-one-with-kids'] } })
    const parent = person({
      name: 'B', gender: 'man',
      lifestyle: { ...person({ name: 'x' }).lifestyle, kids: 'have-done' },
    })
    expect(failedDealbreakers(noKids, parent)).toEqual(['They already have kids'])
  })

  it('cuts hard at the distance limit when nearby-only is on', () => {
    const local = person({
      name: 'A', city: 'Brooklyn, NY',
      prefs: { maxDistanceKm: 40, dealbreakers: ['nearby-only'] },
    })
    const near = person({ name: 'B', gender: 'man', city: 'Manhattan, NY' })
    const far = person({ name: 'C', gender: 'man', city: 'Boston, MA' })
    expect(eligibleFor(local, near)).toBe(true)
    expect(eligibleFor(local, far)).toBe(false)
  })

  it('is one-directional — my rules do not bind them', () => {
    const strict = person({ name: 'A', prefs: { dealbreakers: ['no-smokers'] } })
    expect(eligibleFor(smoker(), strict)).toBe(true)
  })

  it('surfaces the reason as a flag on the score', () => {
    const strict = person({ name: 'Ana', prefs: { dealbreakers: ['no-smokers'] } })
    expect(compatibility(strict, smoker()).flags.join(' ')).toContain('Ana ruled this out')
  })
})

describe('describePreferences', () => {
  it('reads as one plain line', () => {
    const p = person({
      name: 'A',
      prefs: { ageMin: 28, ageMax: 38, heightMin: 175, heightMax: 195, hair: ['brown'], maxDistanceKm: 40 },
    })
    expect(describePreferences(p)).toBe('28-38 · 175-195 cm · brown hair · within 40 km')
  })

  it('leaves out what nobody specified', () => {
    const p = person({ name: 'A', prefs: { ageMin: 25, ageMax: 35, maxDistanceKm: 60 } })
    expect(describePreferences(p)).toBe('25-35 · within 60 km')
  })
})
