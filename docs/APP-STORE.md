# Putting Wingman on the App Store

Two separate questions, and they have very different answers:

- **"Can I get it onto my phone and my friends' phones?"** — Yes, today. TestFlight, an hour of
  work, no gatekeeping. Start at [Ship it to real people this week](#ship-it-to-real-people-this-week).
- **"Can I get it on the public App Store?"** — Not in its current form. Read the next section
  first; submitting before you deal with it wastes a review cycle and risks your developer account.

---

## Read this before you submit

Wingman is a dating app in which **every other person is fictional**. The 35 profiles are sample
data bundled with the build. There is no server, so there is no one to match with.

App Review will see that, and the relevant guidelines are:

| Guideline | What it says | How it applies |
|---|---|---|
| **4.3 Spam** | Duplicative apps, especially in saturated categories | Apple is openly hostile to new dating apps from individual developers. This is the most likely rejection. |
| **2.3.1** | No hidden or misleading functionality | A dating app whose users are fictional must say so plainly, or it reads as misleading. |
| **4.2 Minimum functionality** | Must be more than a demo | A simulated dating app is exactly what this guideline is aimed at. |
| **1.2 UGC** | Social apps need filtering, reporting, blocking and contact info | Doesn't bite yet (no content moves between real people), but it does the moment you add a backend. |
| **5.1.1(v)** | Account deletion | Covered — Settings → Reset everything wipes the device. |

**The app now states this honestly in two places** (welcome screen and Settings): the people are
fictional and nothing reaches another person. That's necessary, but on its own it probably isn't
enough for 4.3.

### The three honest routes

**1. TestFlight only — recommended right now.** Up to 10,000 testers by invite link. Internal
testers (people on your App Store Connect team, up to 100) need no review at all. External testers
need a Beta App Review, which is far lighter than a full submission and doesn't apply 4.3. Your
friends and family get the real app on their real phones. This is almost certainly what you
actually want.

**2. Submit it as what it is — a game.** Change the category to **Entertainment** or **Games →
Simulation**, and lead the description with "a matchmaking game". Fictional characters are
completely fine in a game. This can genuinely pass review. It's a smaller claim than "dating app",
but it's true today, and it gets you a live listing.

**3. Build the backend and submit it as a real dating app.** Then the fictional profiles go away
and the real requirements arrive: accounts and auth, a server holding profiles and grants, plus
everything guideline 1.2 requires — content moderation, a report mechanism, a block mechanism,
published contact info, and a 24-hour response commitment for reported content. Add age
verification, a real privacy policy covering what the server stores, and expect 4.3 scrutiny
regardless. This is months of work, not a weekend.

My recommendation: **do 1 now, decide between 2 and 3 once real people have used it.**

---

## Ship it to real people this week

Everything below happens on a Mac with Xcode.

```bash
git clone <this repo> && cd LoveMatch
npm install
npm run preflight    # checks everything Apple checks, before you spend a build
npm run ios          # builds, syncs, opens Xcode
```

The bundle id is set to **`com.matteoblandino.wingman`**, in both the Xcode project and
`capacitor.config.ts`. It has to be unique across the App Store, and this one will be. If you'd
rather use a domain you own, change it in both places and re-run preflight.

1. **Signing.** Xcode → App target → Signing & Capabilities → tick *Automatically manage signing*
   and pick your Team. The bundle id is already `com.matteoblandino.wingman`.
2. **App Store Connect.** Create the app record: My Apps → + → New App. Platform iOS, bundle id
   `com.matteoblandino.wingman` (register it first at developer.apple.com → Certificates,
   Identifiers & Profiles → Identifiers → + → App IDs), SKU anything (`wingman-001`), primary
   language English.
3. **Archive.** Xcode → Product → Destination → *Any iOS Device (arm64)* → Product → Archive →
   Distribute App → App Store Connect → Upload.
4. **TestFlight.** The build appears after 10–30 minutes of processing. Add yourself as an internal
   tester and install through the TestFlight app. To invite friends, create an external group and
   share the public link; that group needs a one-time Beta App Review (usually a day).

Every upload needs a new build number: Xcode → General → Build (1, 2, 3…).

---

## What's ready for the listing

| Item | Where |
|---|---|
| App icon, 1024px, no alpha | `ios/App/App/Assets.xcassets/AppIcon.appiconset` |
| Screenshots, 6.7" (1290×2796) | `appstore/screenshots/` — seven of them, regenerate with `npm run screenshots` |
| Privacy policy page | `docs/privacy.html` — host it, see below |
| Support page | `docs/support.html` — same host |
| Landing page | `docs/index.html` |
| Age rating | 17+ (dating apps are always 17+) |
| App Privacy answers | **Data Not Collected** — nothing leaves the device |
| Encryption | Already declared: `ITSAppUsesNonExemptEncryption = false` |
| Account deletion | Settings → Reset everything |
| Device family | iPhone only, so no iPad screenshots are required |
| Crash handling | An error screen with reload and reset, not a white screen |

### Hosting the privacy and support pages

Apple requires a live URL for both, and App Store Connect will not let you submit without them.
**This is already done** — `.github/workflows/pages.yml` builds `site/` and deploys it on every
push, so these three URLs are live now and need nothing from you:

- Privacy Policy URL — `https://matteoblandino2004.github.io/LoveMatch/privacy.html`
- Support URL — `https://matteoblandino2004.github.io/LoveMatch/support.html`
- Marketing URL (optional) — `https://matteoblandino2004.github.io/LoveMatch/`

Don't set Pages to *Deploy from a branch* in Settings — that would replace the workflow's output
with the raw repo and break these URLs. The Source must stay **GitHub Actions**.

All three pages are written, styled and cross-linked. `.nojekyll` ships in the built site because
GitHub Pages otherwise hides files it mistakes for drafts.

---

## Draft metadata

**Name:** `Wingman: Set Friends Up` (23) — plain "Wingman" was already taken on the App Store.
The home screen name is separate and stays `Wingman` (`CFBundleDisplayName` in `Info.plist`).

**Subtitle (30 char max):** `Matchmaking for your people` (27)

**Category:** Entertainment (or Social Networking if you go the dating-app route)

**Keywords (100 char max):**
`matchmaker,double date,dating,swipe,matchmaking,couples,wedding date,single,blind date,introduce` (96)

Apple already indexes every word in the app name, so "wingman", "set", "friends" and "up" are
deliberately left out — repeating them here would waste the budget.

**Promotional text (170 max):**

> Everyone knows someone who deserves better. Build them a profile, swipe on their behalf, and find
> them a date for the wedding — with their permission, obviously.

**Description:**

> Wingman is a matchmaking app you use for other people.
>
> You get your own account and swipe for yourself. But you can also ask a friend to let you swipe
> for them — and when they approve you, they appear in your dropdown. Switch between your deck and
> theirs with one tap. They can take that permission back whenever they like.
>
> THEY GET THE FINAL SAY
> Swiping right for a friend doesn't match them with anyone. They get a notification — "Alex thinks
> you should match with Daniel" — and the pick lands in their own Picks tab, where they swipe on it
> themselves. Right and it goes out like any other like. Left and it's over, and only you hear
> about it.
>
> WHAT MAKES A MATCH
> Every card carries a compatibility score out of 100, and tapping it shows the working: shared
> interests, what each of them wants, lifestyle, their stated type, age, distance and values. It
> flags the things worth knowing before you swipe — "they want different things about kids" — and
> writes conversation starters from what the two actually have in common.
>
> SET THEM UP FOR SOMETHING REAL
> "Let's grab a drink sometime" is how nothing happens. Give someone a wedding to bring a date to,
> a double date with you and your partner, or two tickets going spare on Friday. The deck re-scores
> for that specific night, and swiping right sends an invitation instead of a like.
>
> EVERYONE KNOWS SOMEBODY
> Profiles carry family and friends. When the person in front of you isn't right, their best friend
> might be — and they're one tap away.
>
> PRIVATE BY DESIGN
> No account, no server, no analytics. Every profile, photo, swipe and match stays on your phone.
> The app makes no network requests at all — check it in airplane mode.
>
> Note: the people you swipe through are fictional characters included with the app. Wingman is not
> connected to a live dating pool.

**Review notes — paste this in:**

> Wingman is an offline matchmaking app. There is no server, no account system and no network
> requests; all data is stored locally on the device.
>
> All profiles other than the ones the user creates are fictional sample data bundled with the
> build. The app states this on the welcome screen and in Settings. No content is exchanged between
> real users.
>
> To see the app populated: on the welcome screen, tick "I'm 18 or older", then tap
> "Just show me — load a sample family".
>
> To verify no data is collected, run the app in airplane mode — every feature works.

---

## TestFlight beta notes

App Store Connect asks what testers should try. Paste this:

> Wingman is a matchmaking app you use for other people. Tap "I'm 18 or older", then
> "Just show me — load a sample family" to fill the app with example profiles.
>
> Worth trying: swipe a few cards and tap one to see the compatibility breakdown; pick someone for
> Maya, then tap the avatar top-right, switch into Maya's account and answer that pick in the Picks
> tab; open Events and tap "Find someone for this" on the double date; approve a wingman request;
> add a photo to a profile.
>
> Everything is stored on your phone — no account, no server. Settings → Reset everything wipes it.

## After it's live

Version bumps are Xcode → General → Version (`1.0.1`) and Build. Re-archive, re-upload, submit for
review. Web-only changes still need a new binary — the JavaScript is bundled into the app, not
fetched.

---

## Responding to a Guideline 2.1 information request

Apple sends this to developers with no review history. It is a questionnaire, not a defect —
**no new build is required**, you reply in Resolution Center and they re-review.

Paste the answers below into both the Resolution Center reply *and* the Notes field of App Review
Information, which is what they ask for. Every claim here was checked against the source: the app
makes no requests to any server (the two `fetch()` calls in `nativePhotos.ts` read the local file
URI the iOS picker returns), there is no analytics of any kind, and `geo.ts` is a static table of
city coordinates rather than a lookup service.

### 2. Purpose and target audience

> Wingman is a matchmaking app you use on behalf of someone else.
>
> The problem it solves: the person best placed to judge who you'd get along with is usually not
> you — it's your sister, your roommate, your closest friend. Dating apps give that person no role.
> Wingman gives them one.
>
> You build a profile for someone you want to set up, and you can only swipe for them once they
> approve you. When you swipe right on their behalf, it does not match them with anyone — they get
> a notification naming you and the person you chose, and the pick lands in their own "Picks" tab
> where they swipe on it themselves. The decision stays with the person being set up.
>
> The app also scores compatibility out of 100 and shows its working, and lets you aim a search at
> a specific occasion — a wedding you need a plus-one for, a double date.
>
> Target audience: adults, 17 and over, who want to set up people they know. The App Store category
> is Entertainment rather than Social Networking because the profiles are fictional characters
> bundled with the app, not a live dating pool.

### 3. Setup and access instructions

> There are no accounts and no credentials — nothing to sign into, and no demo account is needed.
>
> On first launch: tap "I'm 18 or older", enter any first name, then tap
> **"Just show me — load a sample family"** to populate the app with example profiles.
>
> - **Swipe** (first tab): drag a card or use the ✕ / ♥ buttons. Tap a card for the full profile
>   and the compatibility breakdown. The row of faces at the top switches whose deck you are in.
> - **Picks**: swipe right for someone else, then tap the avatar at the top right, switch into that
>   person's account, and their pick is waiting in this tab for them to answer.
> - **People**: every profile's family and friends, and search.
> - **Events**: tap "Find someone for this" on an occasion to re-score the deck for that night.
> - **Matches** and **Activity**: results and notifications.
> - **Settings → Reset everything** erases all data from the device.

### 4. External services, tools and platforms

> None. The app has no backend.
>
> - No server, no API, no database off the device
> - No authentication service — there are no accounts
> - No analytics, telemetry, crash reporting or advertising SDK
> - No payment processor and no in-app purchases
> - No AI or machine-learning service; the compatibility score is arithmetic over the two profiles
>   in `src/lib/compatibility.ts`
> - No data provider; distances come from a static table of city coordinates compiled into the app
>
> The only platform frameworks used are Apple's own, reached through Capacitor: the photo library
> and camera pickers (`NSPhotoLibraryUsageDescription`, `NSCameraUsageDescription`), haptics,
> keyboard and status bar.
>
> All data — profiles, photos, swipes, matches — is stored locally in `localStorage` and IndexedDB
> on the device. **This can be verified by running the app in airplane mode: every feature works.**

### 5. Regional differences

> There are none. The app ships a single English (U.S.) localization, behaves identically in every
> region, and has no geo-gated features or content. It makes no network requests, so it cannot
> vary by region.

### 6. Regulated industry or protected third-party material

> Neither applies.
>
> The app is not in a regulated industry. It facilitates no transactions, handles no money, and
> transmits nothing.
>
> All content is original. The sample profiles are fictional characters written for this app. There
> is no licensed media: no stock photography, no third-party fonts (the app uses the iOS system
> font stack), no music or video. Avatars are gradients generated from the person's name at
> runtime. This matches the "No" answer given under Content Rights.

### On user-generated content, reporting and blocking

Worth stating up front, because the rejection letter asks about it:

> Users create profiles on their own device. Nothing a user writes or photographs is transmitted
> anywhere — not to a server, not to another user, not to another device. There is no feed, no
> messaging and no shared content, so there is no user-to-user content that could require a
> reporting or blocking mechanism.
>
> On account deletion: the app has no account system, so Guideline 5.1.1(v) does not apply. Even
> so, **Settings → Reset everything** erases every profile, photo and match from the device.

### The screen recording

Record on a physical iPhone, not the simulator. Settings → Control Centre → add **Screen
Recording**, then swipe down from the top right and tap ⏺.

Start from the home screen and tap the app icon, so the recording opens with the launch. Then, in
one unbroken take of about two minutes:

1. Tap "I'm 18 or older", type a name, tap "Just show me — load a sample family"
2. Swipe a card right and a card left
3. Tap a card to open the full profile, scroll through the compatibility breakdown, close it
4. Tap "Maya" in the row at the top, swipe right on the first card — showing it does **not** match
5. Tap the avatar at the top right, switch into Maya's account
6. Open **Activity** so the "… thinks you should match with …" notification is on screen
7. Open **Picks**, swipe the card right, show the match
8. **People** tab — open a profile, show family and friends
9. **Events** tab — tap "Find someone for this" on the double date
10. Add a photo to a profile from the camera roll, so the system permission prompt is visible
11. **Settings → Reset everything**, to show data deletion

Upload it to YouTube as **unlisted** (not private — a reviewer must be able to open it without a
Google account) or to iCloud Drive with a public link, and put the link in the reply.
