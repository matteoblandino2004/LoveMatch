import type { Person } from '../types'
import { useApp } from '../state/store'
import { accountsOnDevice, requestsAwaiting, swipeableFor } from '../lib/accounts'
import { Avatar } from './Avatar'

interface Props {
  onClose: () => void
  onAddAccount: () => void
}

/** Instagram-style: every account signed in here, one tap to switch. */
export function AccountSwitcher({ onClose, onAddAccount }: Props) {
  const { state, switchAccount } = useApp()
  const accounts = accountsOnDevice(state)

  return (
    <div>
      <h2 style={{ fontSize: 20 }}>Switch account</h2>
      <p className="tiny muted" style={{ marginTop: 6 }}>
        Everyone signed in on this phone. Switching shows you their deck, their matches and their
        requests — and you can always switch straight back.
      </p>

      <div className="stack" style={{ marginTop: 16 }}>
        {accounts.map((person) => (
          <AccountRow
            key={person.id}
            person={person}
            current={person.id === state.currentAccountId}
            onPick={() => {
              switchAccount(person.id)
              onClose()
            }}
          />
        ))}
      </div>

      <button className="btn btn-ghost btn-block" style={{ marginTop: 12 }} onClick={onAddAccount}>
        + Add another account
      </button>
    </div>
  )
}

function AccountRow({
  person, current, onPick,
}: {
  person: Person
  current: boolean
  onPick: () => void
}) {
  const { state } = useApp()
  const waiting = requestsAwaiting(state, person.id).length
  const canSwipeFor = swipeableFor(state, person.id).length - 1

  return (
    <button
      className="row"
      onClick={onPick}
      style={{ borderColor: current ? 'rgba(255,77,121,0.45)' : undefined }}
    >
      <Avatar person={person} size={44} />
      <div className="row-main">
        <div className="row-title">
          {person.name}
          {current && <span className="chip chip-hot tiny">signed in</span>}
        </div>
        <div className="row-sub">
          {canSwipeFor > 0
            ? `Wingman for ${canSwipeFor} ${canSwipeFor === 1 ? 'person' : 'people'}`
            : 'Swiping for themselves'}
        </div>
      </div>
      {waiting > 0 && <span className="chip chip-amber tiny">{waiting} to answer</span>}
    </button>
  )
}
