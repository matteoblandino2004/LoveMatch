# Shipping by Friday

Written Monday 21 September. Four days. It is possible, and there are two things that decide it.

## The two blockers, before anything else

**1. You need a Mac by Tuesday.** Not Wednesday. Apple only allows archiving and uploading from
macOS — there is no Windows path, no web upload, no workaround. Borrow one, or rent a cloud Mac
(MacinCloud or MacStadium, roughly $1–2/hour, works fine for this). If you can't get one by Tuesday
evening, Friday is gone and the honest move is TestFlight instead, which is just as real for getting
it into people's hands.

**2. Pick the category today.** This decides whether you get approved or rejected:

- **Entertainment** or **Games → Simulation**, described as a matchmaking game. Fictional characters
  are completely normal in a game. Very likely to pass.
- **Social Networking / dating.** A dating app whose every other user is fictional runs into
  guideline 4.3, and Apple is openly hostile to new dating apps from individual developers. Likely
  rejected, and a rejection on Wednesday means no Friday.

For a Friday deadline, the answer is Entertainment. You can always reposition later, after it has
real users.

## Monday (today) — 30 minutes, on your Dell

- [ ] Confirm your Apple Developer membership is **active** at
      [developer.apple.com/account](https://developer.apple.com/account). If it's still processing,
      everything below waits on it. This is the one thing that can quietly take days.
- [ ] App Store Connect → **Business → Agreements, Tax, and Banking** → accept the **Free Apps**
      agreement. You cannot submit anything until this says Active. Easy to miss, blocks everything.
- [ ] Line up the Mac.
- [ ] Register the App ID: developer.apple.com → Certificates, Identifiers & Profiles →
      **Identifiers → + → App IDs → App** → `com.matteoblandino.wingman`, no capabilities.
- [ ] Create the app record: App Store Connect → **My Apps → + → New App** → iOS, name **Wingman**,
      English (U.S.), that bundle id, SKU `wingman-001`.

If the name "Wingman" is taken on the App Store, have a second choice ready — *Wingman: Set Friends
Up* or *Wingman Matchmaker*. The name has to be unique and you find out at this step.

## Tuesday — the Mac day, 2–3 hours

Follow [MAC-HANDOFF.md](MAC-HANDOFF.md) top to bottom. Start the Xcode download first — it's ~8 GB
and it is the long pole.

- [ ] Xcode installed, Apple ID added under Xcode → Settings → Accounts
- [ ] `git clone`, `npm install`, `npm run preflight` → expect 19 green ticks
- [ ] `npm run ios`, set Team, run on your own iPhone (⌘R), actually use it for ten minutes
- [ ] Destination → **Any iOS Device (arm64)** → **Product → Archive** → Distribute → Upload

Build processing takes 10–30 minutes. Install it from TestFlight and check it on a real phone.

## Wednesday — fill in the listing, submit

Everything below is already written in [APP-STORE.md](APP-STORE.md); it's copy and paste.

- [ ] **Screenshots** — upload all six from `appstore/screenshots/` (6.7", already the right size)
- [ ] **Description, keywords, promotional text** — drafted, paste them in
- [ ] **Category** → Entertainment
- [ ] **Age rating** → complete the questionnaire → it will land on 17+
- [ ] **Privacy Policy URL** → `https://matteoblandino2004.github.io/LoveMatch/privacy.html`
- [ ] **Support URL** → `https://matteoblandino2004.github.io/LoveMatch/support.html`
- [ ] **App Privacy** → **Data Not Collected**
- [ ] **Review notes** → paste the block from APP-STORE.md; it tells the reviewer to tap
      "Just show me — load a sample family", without which they see an empty app and reject it
- [ ] **Submit for Review**

Submitting Wednesday is the whole plan. Most reviews come back within 24 hours, many the same day,
but "usually" is not "always" — Wednesday gives you one full day of slack for a rejection.

## Thursday — slack

If it's approved: set the release to **Manually release this version** so you choose the moment, and
release it Friday.

If it's rejected: read the exact guideline they cite in Resolution Center. Most first rejections are
metadata, not code — wrong age rating, a missing URL, a reviewer who couldn't find any content.
Those are fixed in the listing and resubmitted the same hour, no new build needed.

## Friday — release

Hit release. It appears in the store within a few hours.

## What makes this fail

| Risk | What to do |
|---|---|
| No Mac by Tuesday | Rent a cloud Mac, or switch to TestFlight and drop the Friday target |
| Developer membership still processing | Check today — nothing else can start until it's active |
| Free Apps agreement not accepted | Two minutes, but blocks submission entirely |
| Listed as a dating app | Use Entertainment for this deadline |
| Reviewer sees an empty app | The review note handles it — don't skip it |
| App name already taken | Have a backup name ready Monday |

## What is already done

Nothing on this list needs code from you. The app builds, 107 tests pass, preflight is 19 green
ticks. Icon, screenshots, privacy and support pages, description, keywords and review notes are all
written and in the repo.
