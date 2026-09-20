# 🪽 Wingman

A dating app you use **for other people**. Be someone's wingman.

Tinder and Hinge assume the person swiping is the person dating. Wingman doesn't. You make a
profile for your sister, your best friend, your cousin who swears he's fine — as many as you want —
and you swipe on their behalf. When the other side swipes back, everyone gets the notification, with
a compatibility score that shows its work.

You can also make a profile for yourself, swipe for yourself, and let your people swipe for you — and
find someone for a *specific thing*: a wedding you need a +1 for, a double date with you and your
partner, two tickets going spare on Friday.

It runs in a browser and as a real iOS app — the native project is in `ios/`, ready to open in
Xcode and sign with your Apple Developer account. See [docs/IOS.md](docs/IOS.md).


## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 102 unit tests over the scoring engines, circles, occasions and the reducer
npm run build    # typecheck + production bundle into dist/
npm run preview  # serve the built bundle
npm run ios      # build, sync and open the iOS app in Xcode (macOS)
npm run build:single   # one self-contained wingman.html you can just double-click
npm run preflight      # checks everything Apple checks, before you spend a build
npm run screenshots    # regenerate the App Store screenshots from the running app
```

`wingman.html` in the repo root is that build, checked in so you can download and open it without
a toolchain: one file, no server, no network. It runs from `file://` — the script is inlined as a
classic script at the end of the body, because a module script won't load off disk and a classic one
in the head would run before there's anything to mount on. Safari is stricter than Chrome about
storage for local files, so if profiles don't survive a reload there, use the browser you'd normally
browse in, or the hosted build.

No backend, no API keys, no sign-up. Profiles and swipes live in `localStorage`; photos live in
IndexedDB. Nothing leaves the device — the app makes no network requests at all.

## What it does

**Accounts, and permission.** You have your own account, like any social app — your profile, your
deck, your matches. Swiping for someone else is a permission they grant, not something you assume:
you ask, they answer, and only then do they appear in the dropdown at the top of the deck. They can
take it back whenever they like, and you're put straight back on your own deck.

Several accounts can be signed in on one phone, and the avatar in the header switches between them
the way Instagram does. Switching shows you that person's deck, their matches, their activity and
the requests waiting on *their* answer — which is also how you approve a request while both people
are sitting on the same sofa. People who aren't signed in here answer in their own time, and how
likely they are to say yes depends on how they know you: family almost always, a friend usually, a
stranger rarely.

**Unlimited profiles.** Your roster holds one profile per person you're setting up, plus optionally
your own. Each carries the usual dating-profile content (bio, photos-as-gradients, prompts,
lifestyle, what they're looking for) plus two things a normal dating app has no room for: *how you
know them* and *your pitch as their matchmaker*.

**Six photos per person.** Add up to six real photos to any profile. In the iOS app that's the
native Photos sheet or the camera; in a browser it's a file input you tap directly — never a hidden
input clicked from JavaScript, which is the usual reason a picker does nothing on an iPhone. They're downscaled to 1440px
and re-encoded before saving, so six cost about a megabyte rather than thirty. The first is the main
photo; tap ◀ ▶ to reorder. Cards show them as a carousel — tap the upper half to flip through, tap
down near the name for the full profile. Profiles with no photos still get their generated gradient.

**Swiping as someone else.** Pick whose deck you're in from the switcher at the top of the swipe
screen. Drag the card or use the buttons. ★ attaches a note from you — "you two would not stop
talking" — which rides along with the like and shows up again if it becomes a match.

**Their type — the preferences you'd actually list.** Every profile carries what that person is
looking for: an age range, a height range, hair colours, how far they'll travel. Those feed a "Their
type" slice of the compatibility score, counted *both ways* — someone who fits your sister's type but
whose own type she doesn't fit isn't a match, and the score says so.

Separately there are **dealbreakers**, which are hard rules rather than points: no smokers, must want
kids, must not want kids, no one who already has kids, nearby only. Anyone who fails one never
appears in that person's deck at all, and where they do show up — in a circle list, say — the app
names the rule they failed instead of silently hiding them. They're one-directional: your rules
filter your deck, not theirs.

**Occasions — a real thing on the calendar.** "Let's grab a drink sometime" is how nothing happens.
Give someone on your roster something to go to, and the app finds a date *for that*:

| | |
|---|---|
| 💒 Wedding +1 | 👯 Double date |
| 🎉 Party or birthday | 🍝 Family thing |
| ✈️ Trip or festival | 🎟️ I have two tickets |

The example this was built around: **John is setting up his friend Tony, so Tony can double date
with John and his girlfriend.** That's one occasion on Tony's profile, with John and his girlfriend
listed as the other half of the four.

Switch the deck to an occasion and everything changes. Cards carry a ribbon naming it, the score
becomes a blend of *how well they suit the person* and *how well they suit the night*, and swiping
right sends an invitation rather than a like — which can be accepted or turned down, with a reply
either way. Some people in the app are also trying to fill something of their own, and their card
says so; when it's the same kind of thing as yours, the fit score goes up.

The occasion-fit score is its own 100 points: **getting there** (30) — real distance to the venue
against how far they'll travel; **the vibe** (25) — a black-tie wedding aimed at a happy homebody is
a warning, not a match; **their kind of thing** (25) — interests that suit this specific occasion;
and **the size of the ask** (20) — four days in Rome with someone's entire family is a lot to ask of
a person who's here for something casual, and the app says so out loud.

You can ask several people at once, but one date is all it needs: the first yes fills it, and
everyone still waiting has their invitation withdrawn rather than piling up three dates for one
wedding.

**Family and friends — the real way people get set up.** Every profile has a **Family** section and
a **Friends** section, and everyone in the app has both. Open a candidate and you can see who they're
related to and who they run with, each one scored against the person you're swiping for — so when
Luca is a 62 for your sister but his friend Daniel is a 99, you find that out from Luca's profile
rather than never.

Tapping anyone in those sections opens *their* profile, which has its own family and friends, so you
can walk the graph as far as it goes and send the like from wherever you land. Adding people is a
search over everyone in the app by **name, city, work or interests**, and links are stored once and
read from both sides: label them the way they'd read to either person ("cousins", not "my cousin").

Walking the graph can reach people the deck filtered out for failing a dealbreaker. The app says so
plainly — *"Maya's dealbreakers rule this out: they smoke"* — and the like button becomes *"Against
Maya's rules — send anyway"*, because the rule is real but a matchmaker is a person who can overrule
it.

**Matchmaker circles — the "is there someone better?" problem.** Nobody is matchmaking for exactly
one person, and that cuts both ways:

- Their side: a lot of people in the app were put there by *their* matchmaker. Tap **Set up by
  Rosa** on a card and you get Rosa's whole circle — her cousin, her brother, her best friend —
  each scored against the person you're swiping for. Daniel might be a 99, but his brother might
  be the 77 you were actually going to swipe on.
- Your side: **⇄ Better for someone else on your roster?** takes the candidate in front of you and
  scores them against everyone *you're* setting up. Send the like from whoever actually fits — your
  cousin instead of your sister — without leaving the card or switching profiles. People who aren't
  open to each other are shown greyed out with the reason, rather than hidden.

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
| Shared interests | 22 | Overlapping interests; four in common is already a strong signal |
| What they want | 16 | A matrix over intent — serious, casual, friends first, figuring it out |
| Lifestyle | 14 | Kids (45% of the facet on its own), drinking, smoking, exercise, pets |
| Their type | 14 | Height, hair and age against what each of them said they're after, both ways |
| Age | 12 | The gap, hard-capped when either side's stated range is violated |
| Location | 12 | Real distance between cities via haversine, then hometown as a bonus |
| Values & energy | 10 | Politics, how central faith is, and social battery |

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
    accounts.ts             accounts, wingman permission, and who can see what (pure, tested)
    circles.ts              matchmaker circles + "who fits this person best?" ranking (pure, tested)
    connections.ts          the family/friend graph and people search (pure, tested)
    occasions.ts            occasion kinds, occasion-fit scoring, invitations (pure, tested)
    photos.ts               IndexedDB photo store, downscaling and re-encoding
    geo.ts                  city gazetteer + haversine distance
    native.ts               iOS status bar and haptics; no-ops in a browser
    people.ts               profile factory and defaults
    seed.ts                 35 community profiles (12 of them in matchmaker circles)
                            + a sample family to try it with
    storage.ts              localStorage load/save with a version gate
    options.ts, id.ts, time.ts
  state/store.tsx           one reducer, one context, all state transitions (tested)
  components/               SwipeDeck (pointer-event drag), Photos, AccountSwitcher,
                            WingmanRequest, CircleSheet, CirclePanel, PeopleSearch,
                            ProfileDetail, Sheet, Avatar, Meter
  screens/                  Onboarding, Swipe, Roster, Events, Matches, Notifications,
                            ProfileEditor, OccasionEditor
ios/                        the Capacitor iOS app — open App.xcworkspace in Xcode
appstore/screenshots/       six 6.7" App Store screenshots, generated from the running app
docs/MAC-HANDOFF.md         the whole iOS release, start to finish, for when you have a Mac
docs/DOMAIN.md              pointing your own domain at the live site
docs/IOS.md                 building, signing and running on a device
docs/APP-STORE.md           submission runbook, review-guideline risks, draft listing copy
docs/index.html             landing, support and privacy pages — GitHub Pages serves /docs
docs/support.html           the support URL Apple requires
docs/privacy.html           the privacy policy Apple requires a URL for
scripts/preflight.mjs       mechanical check of every submission requirement
.github/workflows/ci.yml    typecheck, tests and both builds on every push
```

React + TypeScript + Vite, plus Capacitor for the iOS shell — and nothing else. The swipe gestures,
the photo carousel, the confetti, the bottom sheets and the generated avatars are all hand-rolled,
so `npm install` pulls no UI dependencies.

Photos are the one thing that doesn't go in `localStorage`: six images per person across a roster
would blow past the 5 MB quota, so the bytes live in IndexedDB and profiles carry only photo ids.
Deleting a profile deletes its photos with it, and the store degrades to "no photos" rather than
throwing if a browser blocks storage.

State changes all go through one reducer, which makes the interesting behaviour testable without a
DOM: adding a profile announces it, a matchmaker's like notifies the person, a delayed like sits in
`pending` until its reveal time passes, an invitation's answer is revealed on a timer and closes out
every other ask for that occasion, undo removes the swipe *and* the match it produced, and deleting a
profile takes its swipes, matches, occasions and notifications with it.

Whether someone likes you back, or says yes to a wedding, is a hash of the pairing rather than a
coin flip — so the simulated world is the same after a reload. That hash needed a proper avalanche
step to get right: plain FNV-1a leaves strings sharing a long prefix with near-identical high bits,
and since those high bits become the roll, every invitation from one person came back with the same
answer. There's a regression test for it.

## A note on manners

Making a dating profile for someone who didn't ask is a real thing to do to a person. That used to
be a checkbox saying they'd consented; it's now the actual mechanism. Creating someone's account
sends them a request, and until they approve it you cannot swipe for them — the dropdown simply
doesn't offer them. Set up people who want to be set up.

## Privacy

Everything is on your device: profiles and swipes in `localStorage` under one key, photos in
IndexedDB. There is no server, no account, no analytics and no network requests. Clearing site data
clears your roster; **Settings → Reset everything** does the same on purpose, photos included.
