import { useState } from 'react'
import type { Dealbreaker, Gender, HairColor, Intent, Person, Preferences, Prompt } from '../types'
import {
  FAITH_LABELS, FREQUENCY_LABELS, GENDER_LABELS, INTENT_LABELS,
  INTEREST_GROUPS, KIDS_LABELS, PET_LABELS, POLITICS_LABELS, PROMPT_QUESTIONS,
  RELATIONSHIP_SUGGESTIONS, SOCIAL_LABELS,
} from '../lib/options'
import { CITIES, findCity } from '../lib/geo'
import { Avatar } from '../components/Avatar'
import { HAIR_LABELS } from '../lib/people'
import { PhotoEditor } from '../components/Photos'

interface Props {
  initial: Person
  onSave: (person: Person) => void
  onCancel: () => void
  onDelete?: () => void
}

const GENDERS: Gender[] = ['woman', 'man', 'nonbinary']
const HAIRS = Object.keys(HAIR_LABELS) as HairColor[]

const DEALBREAKERS: { id: Dealbreaker; label: string; note: string }[] = [
  { id: 'no-smokers', label: 'No smokers', note: 'Only people who never smoke' },
  { id: 'must-want-kids', label: 'Must want kids', note: 'Rules out anyone who has said no' },
  { id: 'must-not-want-kids', label: "Must not want kids", note: 'Rules out anyone set on having them' },
  { id: 'no-one-with-kids', label: 'No one who has kids', note: 'Rules out existing parents' },
  { id: 'nearby-only', label: 'Nearby only', note: 'Hard cut at the distance below' },
]
const INTENTS = Object.keys(INTENT_LABELS) as Intent[]
const MAX_INTERESTS = 10

export function ProfileEditor({ initial, onSave, onCancel, onDelete }: Props) {
  const [p, setP] = useState<Person>(initial)
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')

  const isSelf = p.managed?.kind === 'self'
  const set = <K extends keyof Person>(key: K, value: Person[K]) =>
    setP((prev) => ({ ...prev, [key]: value }))
  const setPref = <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
    setP((prev) => ({ ...prev, prefs: { ...prev.prefs, [key]: value } }))

  function toggleHair(hair: HairColor) {
    setP((prev) => ({
      ...prev,
      prefs: {
        ...prev.prefs,
        hair: prev.prefs.hair.includes(hair)
          ? prev.prefs.hair.filter((h) => h !== hair)
          : [...prev.prefs.hair, hair],
      },
    }))
  }

  function toggleDealbreaker(rule: Dealbreaker) {
    setP((prev) => {
      const has = prev.prefs.dealbreakers.includes(rule)
      let next = has
        ? prev.prefs.dealbreakers.filter((d) => d !== rule)
        : [...prev.prefs.dealbreakers, rule]
      // Wanting kids and not wanting kids can't both be requirements.
      if (!has && rule === 'must-want-kids') next = next.filter((d) => d !== 'must-not-want-kids')
      if (!has && rule === 'must-not-want-kids') next = next.filter((d) => d !== 'must-want-kids')
      return { ...prev, prefs: { ...prev.prefs, dealbreakers: next } }
    })
  }
  const setLife = <K extends keyof Person['lifestyle']>(key: K, value: Person['lifestyle'][K]) =>
    setP((prev) => ({ ...prev, lifestyle: { ...prev.lifestyle, [key]: value } }))

  function toggleInterest(name: string) {
    setP((prev) => {
      const has = prev.interests.includes(name)
      if (!has && prev.interests.length >= MAX_INTERESTS) return prev
      return {
        ...prev,
        interests: has ? prev.interests.filter((i) => i !== name) : [...prev.interests, name],
      }
    })
  }

  function toggleGenderInterest(g: Gender) {
    setP((prev) => {
      const has = prev.interestedIn.includes(g)
      const next = has ? prev.interestedIn.filter((x) => x !== g) : [...prev.interestedIn, g]
      return { ...prev, interestedIn: next.length ? next : prev.interestedIn }
    })
  }

  function setPrompt(index: number, patch: Partial<Prompt>) {
    setP((prev) => {
      const prompts = [...prev.prompts]
      const current = prompts[index] ?? { question: PROMPT_QUESTIONS[index], answer: '' }
      prompts[index] = { ...current, ...patch }
      return { ...prev, prompts }
    })
  }

  function save() {
    if (!p.name.trim()) {
      setError('A name, at least — even a nickname.')
      setStep(0)
      return
    }
    if (p.age < 18 || p.age > 110) {
      setError('Age has to be between 18 and 110.')
      setStep(0)
      return
    }
    if (!isSelf && !p.managed?.relationship.trim()) {
      setError('How do you know them? "My cousin", "My roommate"…')
      setStep(0)
      return
    }
    const cleaned: Person = {
      ...p,
      name: p.name.trim(),
      city: p.city.trim(),
      hometown: p.hometown.trim() || p.city.trim(),
      region: findCity(p.city)?.region ?? p.region,
      prompts: p.prompts.filter((x) => x.answer.trim()),
      prefs: {
        ...p.prefs,
        ageMin: Math.min(p.prefs.ageMin, p.prefs.ageMax),
        ageMax: Math.max(p.prefs.ageMin, p.prefs.ageMax),
        heightMin: Math.min(p.prefs.heightMin, p.prefs.heightMax),
        heightMax: Math.max(p.prefs.heightMin, p.prefs.heightMax),
      },
    }
    onSave(cleaned)
  }

  const steps = ['Who', 'Life', 'Interests', 'Wants']

  return (
    <div>
      <div className="between" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
          <Avatar person={p} size={42} />
          <div>
            <h2 style={{ fontSize: 19 }}>{p.name || (isSelf ? 'Your profile' : 'New profile')}</h2>
            <div className="tiny muted">{isSelf ? 'This one is yours' : 'Someone you are setting up'}</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>
          Close
        </button>
      </div>

      <div className="pill-tab">
        {steps.map((label, i) => (
          <button key={label} className={step === i ? 'on' : ''} onClick={() => setStep(i)}>
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="card tiny" style={{ marginTop: 12, borderColor: 'rgba(255,107,129,0.5)', color: '#ff9aa8' }}>
          {error}
        </div>
      )}

      {step === 0 && (
        <div>
          <PhotoEditor person={p} onChange={(photos) => set('photos', photos)} />

          {!isSelf && (
            <>
              <div className="field">
                <label htmlFor="rel">How do you know them?</label>
                <input
                  id="rel"
                  className="input"
                  list="relationships"
                  placeholder="My sister"
                  value={p.managed?.relationship ?? ''}
                  onChange={(e) =>
                    setP((prev) => ({
                      ...prev,
                      managed: { ...prev.managed!, relationship: e.target.value },
                    }))
                  }
                />
                <datalist id="relationships">
                  {RELATIONSHIP_SUGGESTIONS.map((r) => (
                    <option value={r} key={r} />
                  ))}
                </datalist>
              </div>
              <div className="field">
                <label htmlFor="pitch">Your pitch as their matchmaker</label>
                <textarea
                  id="pitch"
                  className="textarea"
                  placeholder="Why someone would be lucky to meet them. This shows on their card."
                  value={p.managed?.pitch ?? ''}
                  onChange={(e) =>
                    setP((prev) => ({ ...prev, managed: { ...prev.managed!, pitch: e.target.value } }))
                  }
                />
              </div>
              <label
                className="row"
                style={{ marginTop: 12, cursor: 'pointer' }}
                onClick={() =>
                  setP((prev) => ({
                    ...prev,
                    managed: { ...prev.managed!, consented: !prev.managed!.consented },
                  }))
                }
              >
                <div style={{ fontSize: 20 }}>{p.managed?.consented ? '✅' : '⬜️'}</div>
                <div className="row-main">
                  <div className="row-title">They know I'm doing this</div>
                  <div className="row-sub" style={{ whiteSpace: 'normal' }}>
                    Matches only go live once they've said yes.
                  </div>
                </div>
              </label>
            </>
          )}

          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              className="input"
              value={p.name}
              placeholder="Maya"
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="age">Age</label>
              <input
                id="age"
                type="number"
                className="input"
                min={18}
                max={110}
                value={p.age}
                onChange={(e) => set('age', Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="pronouns">Pronouns</label>
              <input
                id="pronouns"
                className="input"
                value={p.pronouns}
                onChange={(e) => set('pronouns', e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label>Gender</label>
            <div className="chip-row">
              {GENDERS.map((g) => (
                <button
                  key={g}
                  className={`toggle ${p.gender === g ? 'on' : ''}`}
                  onClick={() => set('gender', g)}
                >
                  {GENDER_LABELS[g]}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Interested in</label>
            <div className="chip-row">
              {GENDERS.map((g) => (
                <button
                  key={g}
                  className={`toggle ${p.interestedIn.includes(g) ? 'on' : ''}`}
                  onClick={() => toggleGenderInterest(g)}
                >
                  {GENDER_LABELS[g]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="city">Lives in</label>
              <input
                id="city"
                className="input"
                list="cities"
                value={p.city}
                onChange={(e) => set('city', e.target.value)}
              />
              <datalist id="cities">
                {CITIES.map((c) => (
                  <option value={c.name} key={c.name} />
                ))}
              </datalist>
            </div>
            <div className="field">
              <label htmlFor="hometown">From</label>
              <input
                id="hometown"
                className="input"
                list="cities"
                value={p.hometown}
                onChange={(e) => set('hometown', e.target.value)}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="job">Work</label>
              <input id="job" className="input" value={p.job} onChange={(e) => set('job', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="school">School</label>
              <input
                id="school"
                className="input"
                value={p.education}
                onChange={(e) => set('education', e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label>Hair</label>
            <div className="chip-row">
              {HAIRS.map((h) => (
                <button
                  key={h}
                  className={`toggle toggle-sm ${p.hair === h ? 'on' : ''}`}
                  onClick={() => set('hair', h)}
                >
                  {HAIR_LABELS[h]}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="height">Height — {p.heightCm} cm</label>
            <input
              id="height"
              type="range"
              className="range"
              min={140}
              max={210}
              value={p.heightCm}
              onChange={(e) => set('heightCm', Number(e.target.value))}
            />
          </div>

          <div className="field">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              className="textarea"
              placeholder={isSelf ? 'Say something true.' : 'Describe them the way you would to a friend.'}
              value={p.bio}
              onChange={(e) => set('bio', e.target.value)}
            />
          </div>

          <div className="field">
            <label>Card colour</label>
            <input
              type="range"
              className="range"
              min={0}
              max={359}
              value={p.accent}
              onChange={(e) => set('accent', Number(e.target.value))}
            />
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <Choice
            label="Drinking"
            value={p.lifestyle.drinking}
            options={FREQUENCY_LABELS}
            onChange={(v) => setLife('drinking', v)}
          />
          <Choice
            label="Smoking"
            value={p.lifestyle.smoking}
            options={FREQUENCY_LABELS}
            onChange={(v) => setLife('smoking', v)}
          />
          <Choice
            label="Exercise"
            value={p.lifestyle.exercise}
            options={FREQUENCY_LABELS}
            onChange={(v) => setLife('exercise', v)}
          />
          <Choice
            label="Kids"
            value={p.lifestyle.kids}
            options={KIDS_LABELS}
            onChange={(v) => setLife('kids', v)}
          />
          <Choice
            label="Pets"
            value={p.lifestyle.pets}
            options={PET_LABELS}
            onChange={(v) => setLife('pets', v)}
          />
          <Choice
            label="Politics"
            value={p.lifestyle.politics}
            options={POLITICS_LABELS}
            onChange={(v) => setLife('politics', v)}
          />
          <div className="field">
            <label>Faith — {FAITH_LABELS[p.lifestyle.faith - 1]}</label>
            <input
              type="range"
              className="range"
              min={1}
              max={5}
              value={p.lifestyle.faith}
              onChange={(e) => setLife('faith', Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Social battery — {SOCIAL_LABELS[p.lifestyle.socialEnergy - 1]}</label>
            <input
              type="range"
              className="range"
              min={1}
              max={5}
              value={p.lifestyle.socialEnergy}
              onChange={(e) => setLife('socialEnergy', Number(e.target.value))}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="field">
            <label>
              Interests — {p.interests.length}/{MAX_INTERESTS}
            </label>
            <div className="hint">These drive the biggest slice of the compatibility score.</div>
          </div>
          {INTEREST_GROUPS.map((group) => (
            <div key={group.group} style={{ marginTop: 14 }}>
              <div className="section-label" style={{ margin: '0 0 8px' }}>
                {group.group}
              </div>
              <div className="chip-row">
                {group.items.map((item) => (
                  <button
                    key={item}
                    className={`toggle toggle-sm ${p.interests.includes(item) ? 'on' : ''}`}
                    onClick={() => toggleInterest(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="section-label">Prompts</div>
          {[0, 1, 2].map((i) => (
            <div className="card" key={i} style={{ marginBottom: 10 }}>
              <select
                className="select"
                value={p.prompts[i]?.question ?? PROMPT_QUESTIONS[i]}
                onChange={(e) => setPrompt(i, { question: e.target.value })}
              >
                {PROMPT_QUESTIONS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
              <textarea
                className="textarea"
                style={{ marginTop: 8, minHeight: 60 }}
                placeholder="…"
                value={p.prompts[i]?.answer ?? ''}
                onChange={(e) => setPrompt(i, { answer: e.target.value })}
              />
            </div>
          ))}
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="field">
            <label>What are they here for?</label>
            <div className="chip-row">
              {INTENTS.map((i) => (
                <button
                  key={i}
                  className={`toggle toggle-sm ${p.intent === i ? 'on' : ''}`}
                  onClick={() => set('intent', i)}
                >
                  {INTENT_LABELS[i]}
                </button>
              ))}
            </div>
          </div>

          <div className="section-label">Their type</div>
          <p className="tiny muted" style={{ marginTop: -4 }}>
            The things you'd actually list if a friend asked what they're looking for. These feed the
            "Their type" slice of every compatibility score.
          </p>

          <div className="grid-2">
            <div className="field">
              <label>Youngest — {p.prefs.ageMin}</label>
              <input
                type="range"
                className="range"
                min={18}
                max={80}
                value={p.prefs.ageMin}
                onChange={(e) => setPref('ageMin', Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>Oldest — {p.prefs.ageMax}</label>
              <input
                type="range"
                className="range"
                min={18}
                max={80}
                value={p.prefs.ageMax}
                onChange={(e) => setPref('ageMax', Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="field">
              <label>Shortest — {p.prefs.heightMin} cm</label>
              <input
                type="range"
                className="range"
                min={140}
                max={210}
                value={p.prefs.heightMin}
                onChange={(e) => setPref('heightMin', Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>Tallest — {p.prefs.heightMax} cm</label>
              <input
                type="range"
                className="range"
                min={140}
                max={210}
                value={p.prefs.heightMax}
                onChange={(e) => setPref('heightMax', Number(e.target.value))}
              />
            </div>
          </div>
          <div className="hint" style={{ marginTop: -6 }}>
            Leave it wide open (140-210) and height stops counting at all.
          </div>

          <div className="field">
            <label>Hair they go for</label>
            <div className="chip-row">
              {HAIRS.map((h) => (
                <button
                  key={h}
                  className={`toggle toggle-sm ${p.prefs.hair.includes(h) ? 'on' : ''}`}
                  onClick={() => toggleHair(h)}
                >
                  {HAIR_LABELS[h]}
                </button>
              ))}
            </div>
            <div className="hint">
              {p.prefs.hair.length
                ? 'A preference, not a rule — off-type people still show up, just lower.'
                : 'Nothing picked means no preference.'}
            </div>
          </div>

          <div className="field">
            <label>Willing to travel — {p.prefs.maxDistanceKm} km</label>
            <input
              type="range"
              className="range"
              min={5}
              max={300}
              step={5}
              value={p.prefs.maxDistanceKm}
              onChange={(e) => setPref('maxDistanceKm', Number(e.target.value))}
            />
          </div>

          <div className="section-label">Dealbreakers</div>
          <p className="tiny muted" style={{ marginTop: -4 }}>
            These are hard rules. Anyone who fails one never appears in {p.name || 'their'} deck at
            all, so use them sparingly.
          </p>
          <div className="stack" style={{ marginTop: 10 }}>
            {DEALBREAKERS.map((d) => {
              const on = p.prefs.dealbreakers.includes(d.id)
              return (
                <button
                  key={d.id}
                  className="row"
                  onClick={() => toggleDealbreaker(d.id)}
                  style={{ borderColor: on ? 'rgba(255,77,121,0.45)' : undefined }}
                >
                  <div style={{ fontSize: 19 }}>{on ? '🚫' : '⬜️'}</div>
                  <div className="row-main">
                    <div className="row-title">{d.label}</div>
                    <div className="row-sub" style={{ whiteSpace: 'normal' }}>
                      {d.note}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {onDelete && (
            <>
              <hr className="hr" />
              <button className="btn btn-danger btn-block" onClick={onDelete}>
                Delete this profile
              </button>
            </>
          )}
        </div>
      )}

      <div className="sheet-actions">
        <div style={{ display: 'flex', gap: 9 }}>
          {step > 0 && (
            <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          {step < steps.length - 1 ? (
            <button className="btn btn-primary btn-block" onClick={() => setStep(step + 1)}>
              Next
            </button>
          ) : (
            <button className="btn btn-primary btn-block" onClick={save}>
              Save profile
            </button>
          )}
          {step < steps.length - 1 && (
            <button className="btn btn-ghost" onClick={save}>
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Choice<T extends string>({
  label, value, options, onChange,
}: {
  label: string
  value: T
  options: Record<T, string>
  onChange: (value: T) => void
}) {
  const keys = Object.keys(options) as T[]
  return (
    <div className="field">
      <label>{label}</label>
      <div className="chip-row">
        {keys.map((k) => (
          <button key={k} className={`toggle toggle-sm ${value === k ? 'on' : ''}`} onClick={() => onChange(k)}>
            {options[k]}
          </button>
        ))}
      </div>
    </div>
  )
}
