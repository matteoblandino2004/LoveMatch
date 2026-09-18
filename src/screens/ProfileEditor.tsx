import { useState } from 'react'
import type { Gender, Intent, Person, Prompt } from '../types'
import {
  FAITH_LABELS, FREQUENCY_LABELS, GENDER_LABELS, INTENT_LABELS,
  INTEREST_GROUPS, KIDS_LABELS, PET_LABELS, POLITICS_LABELS, PROMPT_QUESTIONS,
  RELATIONSHIP_SUGGESTIONS, SOCIAL_LABELS,
} from '../lib/options'
import { CITIES, findCity } from '../lib/geo'
import { Avatar } from '../components/Avatar'

interface Props {
  initial: Person
  onSave: (person: Person) => void
  onCancel: () => void
  onDelete?: () => void
}

const GENDERS: Gender[] = ['woman', 'man', 'nonbinary']
const INTENTS = Object.keys(INTENT_LABELS) as Intent[]
const MAX_INTERESTS = 10

export function ProfileEditor({ initial, onSave, onCancel, onDelete }: Props) {
  const [p, setP] = useState<Person>(initial)
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')

  const isSelf = p.managed?.kind === 'self'
  const set = <K extends keyof Person>(key: K, value: Person[K]) =>
    setP((prev) => ({ ...prev, [key]: value }))
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
      ageMin: Math.min(p.ageMin, p.ageMax),
      ageMax: Math.max(p.ageMin, p.ageMax),
    }
    onSave(cleaned)
  }

  const steps = ['Who', 'Life', 'Interests', 'Looking for']

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
          <div className="grid-2">
            <div className="field">
              <label>Youngest — {p.ageMin}</label>
              <input
                type="range"
                className="range"
                min={18}
                max={80}
                value={p.ageMin}
                onChange={(e) => set('ageMin', Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>Oldest — {p.ageMax}</label>
              <input
                type="range"
                className="range"
                min={18}
                max={80}
                value={p.ageMax}
                onChange={(e) => set('ageMax', Number(e.target.value))}
              />
            </div>
          </div>
          <div className="field">
            <label>Willing to travel — {p.maxDistanceKm} km</label>
            <input
              type="range"
              className="range"
              min={5}
              max={300}
              step={5}
              value={p.maxDistanceKm}
              onChange={(e) => set('maxDistanceKm', Number(e.target.value))}
            />
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
