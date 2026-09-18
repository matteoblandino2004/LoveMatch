import { useState } from 'react'
import { useApp } from '../state/store'

/** First run: who's holding the phone, and what they're here to do. */
export function Onboarding({ onCreateProfile }: { onCreateProfile: (kind: 'self' | 'other') => void }) {
  const { createAccount, loadSampleRoster } = useApp()
  const [name, setName] = useState('')

  function start(kind: 'self' | 'other') {
    createAccount(name.trim() || 'You')
    onCreateProfile(kind)
  }

  function demo() {
    createAccount(name.trim() || 'You')
    loadSampleRoster()
  }

  return (
    <div className="screen" style={{ paddingTop: 26 }}>
      <div style={{ fontSize: 46, lineHeight: 1 }}>💘</div>
      <h1 className="screen-title" style={{ marginTop: 14, fontSize: 32 }}>
        Everyone knows someone
        <br />
        who deserves better.
      </h1>
      <p className="screen-sub" style={{ fontSize: 15, marginTop: 10 }}>
        LoveMatch is a dating app you can use <i>for other people</i>. Build a profile for your sister,
        your best friend, your cousin who swears he's fine — then swipe on their behalf. When it's
        mutual, everyone gets the notification.
      </p>

      <div className="field" style={{ marginTop: 26 }}>
        <label htmlFor="who">First — what should we call you?</label>
        <input
          id="who"
          className="input"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="given-name"
        />
      </div>

      <div className="section-label">What brings you here?</div>
      <div className="stack">
        <button className="row" onClick={() => start('other')}>
          <div style={{ fontSize: 26 }}>🧑‍🤝‍🧑</div>
          <div className="row-main">
            <div className="row-title">I'm setting someone up</div>
            <div className="row-sub" style={{ whiteSpace: 'normal' }}>
              Make a profile for them and start swiping. Add as many people as you want.
            </div>
          </div>
          <div className="muted">›</div>
        </button>
        <button className="row" onClick={() => start('self')}>
          <div style={{ fontSize: 26 }}>💁</div>
          <div className="row-main">
            <div className="row-title">I'm looking for myself</div>
            <div className="row-sub" style={{ whiteSpace: 'normal' }}>
              Build your own profile — and let your people swipe for you too.
            </div>
          </div>
          <div className="muted">›</div>
        </button>
      </div>

      <hr className="hr" />
      <button className="btn btn-ghost btn-block" onClick={demo}>
        Just show me — load a sample family
      </button>
      <p className="tiny muted center" style={{ marginTop: 12 }}>
        Everything stays on this device. No account, no server, no one selling your cousin's data.
      </p>
    </div>
  )
}
