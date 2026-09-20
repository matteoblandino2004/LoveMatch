import { useState } from 'react'
import type { Person } from '../types'
import { useApp } from '../state/store'
import { describeTie, isOnDevice } from '../lib/accounts'
import { Avatar } from './Avatar'

interface Props {
  owner: Person
  wingman: Person
  onDone: () => void
}

/** Ask someone for permission to swipe on their behalf. */
export function WingmanRequest({ owner, wingman, onDone }: Props) {
  const { state, requestWingman } = useApp()
  const [message, setMessage] = useState('')
  const here = isOnDevice(state, owner.id)

  return (
    <div>
      <h2 style={{ fontSize: 20 }}>Ask to be {owner.name}'s wingman</h2>
      <p className="tiny muted" style={{ marginTop: 6 }}>
        You can't swipe for someone until they say yes. That's the whole rule.
      </p>

      <div className="card" style={{ marginTop: 14, display: 'flex', gap: 11, alignItems: 'center' }}>
        <Avatar person={wingman} size={40} />
        <span style={{ fontSize: 17 }}>🪽</span>
        <Avatar person={owner} size={40} />
        <div style={{ minWidth: 0 }}>
          <b>
            {wingman.name} → {owner.name}
          </b>
          <div className="tiny muted">{describeTie(state, owner.id, wingman.id)}</div>
        </div>
      </div>

      <div className="field">
        <label htmlFor="ask-note">Say something</label>
        <textarea
          id="ask-note"
          className="textarea"
          placeholder="I know exactly the person for you. Let me drive for a week."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      <p className="tiny muted">
        {here
          ? `${owner.name} is signed in on this phone, so switch to their account to answer.`
          : `${owner.name} gets the request on their own phone and answers in their own time.`}
      </p>

      <div className="sheet-actions">
        <button
          className="btn btn-primary btn-block"
          onClick={() => {
            requestWingman({ ownerId: owner.id, wingmanId: wingman.id, message })
            onDone()
          }}
        >
          Send the request
        </button>
      </div>
    </div>
  )
}
