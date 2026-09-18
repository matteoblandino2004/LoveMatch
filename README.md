# 💘 LoveMatch

A dating app you use **for other people**.

Tinder and Hinge assume the person swiping is the person dating. LoveMatch doesn't. You make a
profile for your sister, your best friend, your cousin who swears he's fine — as many as you want —
and you swipe on their behalf. When the other side swipes back, everyone gets the notification, with
a compatibility score that shows its work.

You can also make a profile for yourself, swipe for yourself, and let your people swipe for you.


## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 28 unit tests over the scoring engine and the reducer
npm run build    # typecheck + production bundle into dist/
npm run preview  # serve the built bundle
```

No backend, no API keys, no sign-up. Everything lives in `localStorage` on your device.

## What it does

**Unlimited profiles.** Your roster holds one profile per person you're setting up, plus optionally
your own. Each carries the usual dating-profile content (bio, photos-as-gradients, prompts,
lifestyle, what they're looking for) plus two things a normal dating app has no room for: *how you
know them* and *your pitch as their matchmaker*.

**Swiping as someone else.** Pick whose deck you're in from the switcher at the top of the swipe
screen. Drag the card or use the buttons. ★ attaches a note from you — "you two would not stop
talking" — which rides along with the like and shows up again if it becomes a match.

**A compatibility score that explains itself.** Every card carries a 0–100 score, and tapping it
opens the breakdown: six weighted facets, each with a bar and a plain-English line of reasoning.
It also raises flags worth knowing before you swipe ("they want different things about kids") and
generates conversation starters from what the two actually have in common.

**Notifications.** When a matchmaker picks someone, the person gets told. When it's mutual, both
sides get the match — with the score, the matchmaker's note, and a ready-to-send intro text.

## How the score works

`src/lib/compatibility.ts` is a pure function of two profiles. 100 points across six facets:

| Facet | Weight | What moves it |
|---|---:|---|
| Shared interests | 24 | Overlapping interests; four in common is already a strong signal |
| What they want | 18 | A matrix over intent — serious, casual, friends first, figuring it out |
| Lifestyle | 16 | Kids (45% of the facet on its own), drinking, smoking, exercise, pets |
| Age | 14 | The gap, hard-capped when either side's stated range is violated |
| Location | 14 | Real distance between cities via haversine, then hometown as a bonus |
| Values & energy | 14 | Politics, how central faith is, and social battery |

It's deterministic and symmetric — `compatibility(a, b).score === compatibility(b, a).score` — and
covered by tests, including the invariant that the weights sum to exactly 100.

Whether the other person likes back is also deterministic: `decideReciprocal` hashes the pair of ids
into a stable 0–1 roll and compares it against a probability curve driven by the score. A 90-point
match nearly always lands; a 30-point one rarely does. Replies don't all arrive instantly — some
land seconds later, so notifications actually arrive while you're using the app, and the outcome
never changes on reload.

## Architecture

```
src/
  types.ts                  domain model — Person, Swipe, Match, AppNotification, AppState
  lib/
    compatibility.ts        the scoring engine (pure, tested)
    matchmaking.ts          deck building + the reciprocity simulation (pure, tested)
    geo.ts                  city gazetteer + haversine distance
    people.ts               profile factory and defaults
    seed.ts                 35 community profiles + a sample family to try it with
    storage.ts              localStorage load/save with a version gate
    options.ts, id.ts, time.ts
  state/store.tsx           one reducer, one context, all state transitions (tested)
  components/               SwipeDeck (pointer-event drag), ProfileDetail, Sheet, Avatar, Meter
  screens/                  Onboarding, Swipe, Roster, Matches, Notifications, ProfileEditor
```

React + TypeScript + Vite, and nothing else — the swipe gestures, the confetti, the bottom sheets
and the generated avatars are all hand-rolled, so `npm install` pulls no UI dependencies.

State changes all go through one reducer, which makes the interesting behaviour testable without a
DOM: adding a profile announces it, a matchmaker's like notifies the person, a delayed like sits in
`pending` until its reveal time passes, undo removes the swipe *and* the match it produced, and
deleting a profile takes its swipes, matches and notifications with it.

## A note on manners

Making a dating profile for someone who didn't ask is a real thing to do to a person. The editor
asks you to confirm they said yes, and the roster keeps flagging it until you do. It's not a legal
checkbox — it's the whole premise. Set up people who want to be set up.

## Privacy

Everything is on your device, in `localStorage`, under one key. There is no server, no account and
no analytics. Clearing site data clears your roster; **Settings → Reset everything** does the same
on purpose.
