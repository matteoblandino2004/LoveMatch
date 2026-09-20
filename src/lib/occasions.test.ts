import { describe, expect, it } from 'vitest'
import {
  OCCASION_KINDS, blendScore, blankOccasion, companionLine, decideInvite, fitLabel,
  occasionFit, whenLabel,
} from './occasions'
import { makePerson } from './people'
import type { Occasion, Person } from '../types'

function host(): Person {
  return makePerson({ id: 'h', name: 'Maya', age: 30, gender: 'woman', city: 'Brooklyn, NY' })
}

function guest(over: Partial<Person> = {}): Person {
  return makePerson({
    id: 'g', name: 'Guest', age: 31, gender: 'man', city: 'Brooklyn, NY',
    interests: ['Dancing', 'Big family', 'Travel'], intent: 'long-term',
    ...over,
  })
}

function occasion(over: Partial<Occasion> = {}): Occasion {
  return {
    ...blankOccasion('h', 'Brooklyn, NY'),
    kind: 'wedding',
    title: "My cousin's wedding",
    date: '',
    city: 'Brooklyn, NY',
    vibe: 'big-night',
    ...over,
  }
}

describe('occasionFit', () => {
  it('scores a local, social, family-minded guest far above a distant homebody', () => {
    const wedding = occasion()
    const ideal = guest({
      lifestyle: { ...guest().lifestyle, socialEnergy: 5 },
    })
    const wrong = guest({
      id: 'g2', city: 'Seoul, KR', interests: ['Chess'], intent: 'short-term',
      lifestyle: { ...guest().lifestyle, socialEnergy: 1 },
    })
    expect(occasionFit(wedding, host(), ideal).score).toBeGreaterThan(80)
    expect(occasionFit(wedding, host(), wrong).score).toBeLessThan(35)
  })

  it('keeps the score inside 0..100 and the weights at 100', () => {
    const fit = occasionFit(occasion(), host(), guest())
    expect(fit.score).toBeGreaterThanOrEqual(0)
    expect(fit.score).toBeLessThanOrEqual(100)
    expect(fit.facets.reduce((sum, f) => sum + f.weight, 0)) .toBe(100)
  })

  it('treats a wedding as a bigger ask than two tickets', () => {
    const casual = guest({ intent: 'short-term' })
    const ask = (kind: Occasion['kind']) =>
      occasionFit(occasion({ kind, vibe: OCCASION_KINDS[kind].defaultVibe }), host(), casual)
        .facets.find((f) => f.label === 'Size of the ask')!.score
    expect(ask('activity')).toBeGreaterThan(ask('wedding'))
  })

  it('warns when a big night is pointed at a homebody', () => {
    const homebody = guest({ lifestyle: { ...guest().lifestyle, socialEnergy: 1 } })
    const fit = occasionFit(occasion({ vibe: 'big-night' }), host(), homebody)
    expect(fit.warnings.join(' ')).toContain('homebody')
  })

  it('warns when a wedding is aimed at someone here for something casual', () => {
    const casual = guest({ intent: 'short-term' })
    expect(occasionFit(occasion(), host(), casual).warnings.join(' ')).toContain('casual')
  })

  it('rewards someone who is looking for the same kind of thing', () => {
    const plain = guest()
    const alsoLooking = guest({ seeking: { kind: 'wedding', note: "a +1 for her brother's wedding" } })
    const fit = occasionFit(occasion(), host(), alsoLooking)
    expect(fit.score).toBeGreaterThan(occasionFit(occasion(), host(), plain).score)
    expect(fit.reasons[0]).toContain('same thing')
  })

  it('penalises a venue the guest would have to cross the world for', () => {
    const near = occasionFit(occasion({ city: 'Brooklyn, NY' }), host(), guest())
    const far = occasionFit(occasion({ city: 'Sydney, AU' }), host(), guest())
    const travel = (f: typeof near) => f.facets.find((x) => x.label === 'Getting there')!.score
    expect(travel(near)).toBe(1)
    expect(travel(far)).toBeLessThan(0.5)
  })
})

describe('decideInvite', () => {
  it('is deterministic for the same invitation', () => {
    expect(decideInvite('a', 'b', 'o1', 70)).toEqual(decideInvite('a', 'b', 'o1', 70))
  })

  it('says yes far more often to a strong fit than a weak one', () => {
    let strong = 0
    let weak = 0
    for (let i = 0; i < 400; i++) {
      if (decideInvite(`p${i}`, `t${i}`, 'o', 92).accepted) strong++
      if (decideInvite(`p${i}`, `t${i}`, 'o', 15).accepted) weak++
    }
    expect(strong).toBeGreaterThan(weak * 2)
  })

  it('always carries a reply and a non-negative delay', () => {
    for (let i = 0; i < 40; i++) {
      const answer = decideInvite(`x${i}`, `y${i}`, 'o', 55)
      expect(answer.reply.length).toBeGreaterThan(5)
      expect(answer.delayMs).toBeGreaterThanOrEqual(0)
    }
  })

  it('gives different answers for the same pair at different occasions', () => {
    // Asking the same person to twenty different things should not get twenty
    // identical answers — that was a real bug when the hash under-mixed salts.
    const answers = Array.from({ length: 20 }, (_, i) => decideInvite('a', 'b', `o${i}`, 60).accepted)
    expect(answers.filter(Boolean).length).toBeGreaterThan(2)
    expect(answers.filter((a) => !a).length).toBeGreaterThan(2)
  })
})

describe('helpers', () => {
  it('blends general compatibility with occasion fit', () => {
    expect(blendScore(100, 0)).toBe(60)
    expect(blendScore(0, 100)).toBe(40)
    expect(blendScore(80, 80)).toBe(80)
  })

  it('labels a fit in plain words', () => {
    expect(fitLabel(90)).toBe('Made for it')
    expect(fitLabel(20)).toBe('A stretch')
  })

  it('counts down to the date', () => {
    const now = Date.parse('2026-06-01T12:00:00Z')
    expect(whenLabel('', now)).toBe('No date set')
    expect(whenLabel('2026-06-01', now)).toBe('Today')
    expect(whenLabel('2026-06-02', now)).toBe('Tomorrow')
    expect(whenLabel('2026-06-04', now)).toBe('In 3 days')
    expect(whenLabel('2026-05-30', now)).toContain('ago')
  })

  it('reads out who else is coming', () => {
    expect(companionLine(occasion({ companions: [] }))).toBe('')
    expect(
      companionLine(occasion({ companions: [{ name: 'Gabi', relationship: 'My girlfriend' }] })),
    ).toBe('Also coming: Gabi (my girlfriend)')
    expect(
      companionLine(
        occasion({
          companions: [
            { name: 'John', relationship: 'Me' },
            { name: 'Gabi', relationship: 'My girlfriend' },
          ],
        }),
      ),
    ).toBe('Also coming: John (me) and Gabi (my girlfriend)')
  })
})
