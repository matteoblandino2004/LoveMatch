import { useMemo, useState } from 'react'
import type { Invite, Occasion } from '../types'
import { useApp } from '../state/store'
import { OCCASION_KINDS, VIBES, companionLine, fitLabel, whenLabel } from '../lib/occasions'
import { Avatar } from '../components/Avatar'
import { Sheet } from '../components/Sheet'
import { ProfileDetail } from '../components/ProfileDetail'
import { visibleProfileIds } from '../lib/accounts'

interface Props {
  onCreate: () => void
  onEdit: (occasion: Occasion) => void
  onFill: (occasion: Occasion) => void
  onAddProfile: () => void
}

/** Everything your people need a date for, and how each one is going. */
export function EventsScreen({ onCreate, onEdit, onFill, onAddProfile }: Props) {
  const { state, setOccasionOpen } = useApp()
  const [openInvites, setOpenInvites] = useState<Occasion | null>(null)
  const [viewing, setViewing] = useState<string | null>(null)

  const mine = useMemo(() => new Set(visibleProfileIds(state)), [state])

  const sorted = useMemo(() => {
    return state.occasions.filter((o) => mine.has(o.profileId)).sort((a, b) => {
      if (a.open !== b.open) return a.open ? -1 : 1
      if (!a.date) return 1
      if (!b.date) return -1
      return a.date.localeCompare(b.date)
    })
  }, [state.occasions, mine])

  const invitesFor = (id: string) => state.invites.filter((i) => i.occasionId === id)

  if (!state.currentAccountId) {
    return (
      <div className="screen">
        <h1 className="screen-title">Occasions</h1>
        <div className="empty" style={{ marginTop: 22 }}>
          <span className="emoji">🗓️</span>
          <b>Add someone first</b>
          <p className="tiny" style={{ marginTop: 6 }}>
            Occasions belong to a person — your brother who needs a wedding +1, you and your partner
            looking for a double date.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onAddProfile}>
            Create a profile
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <h1 className="screen-title">Occasions</h1>
      <p className="screen-sub">
        A wedding, a double date, two tickets going spare. People say yes to plans far more than they
        say yes to "we should get a drink sometime".
      </p>

      <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={onCreate}>
        + Something to go to
      </button>

      {sorted.length === 0 ? (
        <div className="empty" style={{ marginTop: 20 }}>
          <span className="emoji">💒</span>
          <b>Nothing on the calendar</b>
          <p className="tiny" style={{ marginTop: 6 }}>
            "Tony needs a date for my wedding in June." "My girlfriend and I want a double date."
            That kind of thing.
          </p>
        </div>
      ) : (
        sorted.map((occasion) => {
          const profile = state.people[occasion.profileId]
          if (!profile) return null
          const meta = OCCASION_KINDS[occasion.kind]
          const invites = invitesFor(occasion.id)
          const accepted = invites.find((i) => i.status === 'accepted')
          const pending = invites.filter((i) => i.status === 'pending').length
          const declined = invites.filter((i) => i.status === 'declined').length
          const companions = companionLine(occasion)

          return (
            <div className="card" key={occasion.id} style={{ marginTop: 12 }}>
              <div className="between">
                <div style={{ display: 'flex', gap: 11, alignItems: 'center', minWidth: 0 }}>
                  <Avatar person={profile} size={44} />
                  <div style={{ minWidth: 0 }}>
                    <div className="row-title" style={{ fontSize: 15 }}>
                      {meta.emoji} {occasion.title}
                    </div>
                    <div className="row-sub">
                      For {profile.name} · {whenLabel(occasion.date)} · {occasion.city}
                    </div>
                  </div>
                </div>
                {accepted ? (
                  <span className="chip chip-mint">Sorted</span>
                ) : occasion.open ? (
                  <span className="chip chip-hot">Open</span>
                ) : (
                  <span className="chip">Closed</span>
                )}
              </div>

              <div className="chip-row" style={{ marginTop: 11 }}>
                <span className="chip">{VIBES[occasion.vibe].label}</span>
                {occasion.byMatchmaker && <span className="chip">★ Your idea</span>}
                {invites.length > 0 && (
                  <span className="chip">
                    {invites.length} asked{pending ? ` · ${pending} waiting` : ''}
                    {declined ? ` · ${declined} no` : ''}
                  </span>
                )}
              </div>

              {companions && (
                <p className="tiny muted" style={{ marginTop: 9 }}>
                  {companions}
                </p>
              )}
              {occasion.details && (
                <p className="tiny" style={{ marginTop: 8 }}>
                  {occasion.details}
                </p>
              )}

              {accepted && (
                <AcceptedBanner invite={accepted} name={state.people[accepted.targetId]?.name ?? 'They'} />
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {!accepted && (
                  <button className="btn btn-primary btn-sm btn-block" onClick={() => onFill(occasion)}>
                    Find someone for this
                  </button>
                )}
                {invites.length > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setOpenInvites(occasion)}>
                    {invites.length} invite{invites.length === 1 ? '' : 's'}
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => onEdit(occasion)}>
                  Edit
                </button>
                {!accepted && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setOccasionOpen(occasion.id, !occasion.open)}
                  >
                    {occasion.open ? 'Pause' : 'Reopen'}
                  </button>
                )}
              </div>
            </div>
          )
        })
      )}

      <Sheet open={!!openInvites} onClose={() => setOpenInvites(null)}>
        {openInvites && (
          <>
            <h2 style={{ fontSize: 20 }}>
              {OCCASION_KINDS[openInvites.kind].emoji} {openInvites.title}
            </h2>
            <p className="tiny muted" style={{ marginTop: 6 }}>
              Everyone asked, and what they said.
            </p>
            <div className="stack" style={{ marginTop: 14 }}>
              {invitesFor(openInvites.id).map((invite) => {
                const person = state.people[invite.targetId]
                if (!person) return null
                return (
                  <div className="card" key={invite.id} style={{ padding: 12 }}>
                    <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                      <button
                        onClick={() => setViewing(person.id)}
                        style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
                        aria-label={`Open ${person.name}'s profile`}
                      >
                        <Avatar person={person} size={42} />
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="row-title" style={{ fontSize: 14.5 }}>
                          {person.name}, {person.age}
                        </div>
                        <div className="row-sub">
                          {invite.score}% overall · {invite.fit}% for this ({fitLabel(invite.fit)})
                        </div>
                      </div>
                      <span
                        className={`chip ${
                          invite.status === 'accepted'
                            ? 'chip-mint'
                            : invite.status === 'declined'
                              ? ''
                              : 'chip-amber'
                        }`}
                      >
                        {invite.status === 'accepted' ? 'Yes' : invite.status === 'declined' ? 'No' : 'Waiting'}
                      </span>
                    </div>
                    {invite.note && (
                      <div className="note-quote" style={{ marginTop: 9 }}>
                        Your note: “{invite.note}”
                      </div>
                    )}
                    {invite.status !== 'pending' && invite.reply && (
                      <p className="tiny" style={{ marginTop: 9 }}>
                        {person.name}: “{invite.reply}”
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Sheet>

      <Sheet open={!!viewing} onClose={() => setViewing(null)} labelledBy="profile-sheet-title">
        {viewing && state.people[viewing] && (
          <ProfileDetail
            person={state.people[viewing]}
            viewer={openInvites ? state.people[openInvites.profileId] : null}
          />
        )}
      </Sheet>
    </div>
  )
}

function AcceptedBanner({ invite, name }: { invite: Invite; name: string }) {
  return (
    <div className="note-quote" style={{ marginTop: 11, borderLeftColor: 'var(--mint)' }}>
      <b>🥂 {name} is going.</b> {invite.reply && `“${invite.reply}”`}
    </div>
  )
}
