import { describe, expect, it } from 'vitest'
import { compatibility, mutuallyEligible, scoreLabel, sharedInterests } from './compatibility'
import { makePerson } from './people'
import type { Person } from '../types'

function person(over: Partial<Person> & { name: string }): Person {
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
    const a = person({ name: 'A', ageMin: 28, ageMax: 34 })
    const inRange = person({ name: 'B', gender: 'man', age: 32 })
    const outOfRange = person({ name: 'C', gender: 'man', age: 44, ageMin: 20, ageMax: 60 })
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
