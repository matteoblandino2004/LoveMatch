import { useState } from 'react'
import { useApp } from '../state/store'
import { blankPerson } from '../lib/people'

/** First run: make your own account. Everything else hangs off it. */
export function Onboarding({ onFinishProfile }: { onFinishProfile: () => void }) {
  const { createAccount, loadSampleRoster } = useApp()
  const [name, setName] = useState('')
  // Dating apps are 17+ on the App Store and 18+ to use. Ask once, up front.
  const [adult, setAdult] = useState(false)

  function makeAccount() {
    const me = blankPerson('self')
    me.name = name.trim() || 'You'
    createAccount(me)
    return me
  }

  return (
    <div className="screen" style={{ paddingTop: 26 }}>
      <div style={{ fontSize: 46, lineHeight: 1 }}>🪽</div>
      <h1 className="screen-title" style={{ marginTop: 14, fontSize: 32 }}>
        Be the reason
        <br />
        they finally meet.
      </h1>
      <p className="screen-sub" style={{ fontSize: 15, marginTop: 10 }}>
        Wingman is a dating app you use <i>for other people</i>. You get your own account and swipe
        for yourself — and when a friend approves you, you can swipe for them too, then switch
        straight back.
      </p>

      <div className="field" style={{ marginTop: 26 }}>
        <label htmlFor="who">Your name</label>
        <input
          id="who"
          className="input"
          placeholder="What your friends call you"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="given-name"
        />
      </div>

      <button
        className="row"
        style={{ marginTop: 14, borderColor: adult ? 'rgba(255,77,121,0.45)' : undefined }}
        onClick={() => setAdult((on) => !on)}
        aria-pressed={adult}
      >
        <div style={{ fontSize: 20 }}>{adult ? '✅' : '⬜️'}</div>
        <div className="row-main">
          <div className="row-title">I'm 18 or older</div>
          <div className="row-sub" style={{ whiteSpace: 'normal' }}>
            Wingman is for adults, and so is everyone you set up.
          </div>
        </div>
      </button>

      <button
        className="btn btn-primary btn-block"
        style={{ marginTop: 12 }}
        disabled={!adult}
        onClick={() => {
          makeAccount()
          onFinishProfile()
        }}
      >
        Create my account
      </button>

      <hr className="hr" />
      <button
        className="btn btn-ghost btn-block"
        disabled={!adult}
        onClick={() => {
          makeAccount()
          loadSampleRoster()
        }}
      >
        Just show me — load a sample family
      </button>

      <div className="card tiny" style={{ marginTop: 16 }}>
        <b>Two things worth knowing.</b> Everything stays on this device — no account, no server, no
        one selling your cousin's data. And the people you'll swipe through are fictional characters
        that ship with the app: Wingman isn't connected to a real dating pool, so nobody on the other
        end is waiting for a message.
      </div>
    </div>
  )
}
