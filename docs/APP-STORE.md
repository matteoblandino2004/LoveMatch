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
npm run ios          # builds, syncs, opens Xcode
```

1. **Signing.** Xcode → App target → Signing & Capabilities → tick *Automatically manage signing*,
   pick your Team, and change the Bundle Identifier from `com.wingman.app` to something you own
   (`com.matteoblandino.wingman`). Change `appId` in `capacitor.config.ts` to match.
2. **App Store Connect.** Create the app record: My Apps → + → New App. Platform iOS, your bundle
   id, SKU anything (`wingman-001`), primary language English.
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
| App icon, 1024px | `ios/App/App/Assets.xcassets/AppIcon.appiconset` |
| Screenshots, 6.7" (1290×2796) | `appstore/screenshots/` — six of them |
| Privacy policy page | `docs/privacy.html` — host it, see below |
| Age rating | 17+ (dating apps are always 17+) |
| App Privacy answers | **Data Not Collected** — nothing leaves the device |
| Encryption | Already declared: `ITSAppUsesNonExemptEncryption = false` |
| Account deletion | Settings → Reset everything |

### Hosting the privacy policy

Apple requires a live URL. Free option, five minutes: in the GitHub repo → Settings → Pages →
Source: deploy from branch, folder `/docs`. The policy lands at
`https://<your-username>.github.io/LoveMatch/privacy.html`. Use that as both the Privacy Policy URL
and, if you have nothing better, the Support URL.

---

## Draft metadata

**Name:** Wingman

**Subtitle (30 char max):** `Set your friends up` (19)

**Category:** Entertainment (or Social Networking if you go the dating-app route)

**Keywords (100 char max):**
`matchmaker,set up friends,wingman,double date,dating,swipe,matchmaking,couples,wedding date,single`

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

## After it's live

Version bumps are Xcode → General → Version (`1.0.1`) and Build. Re-archive, re-upload, submit for
review. Web-only changes still need a new binary — the JavaScript is bundled into the app, not
fetched.
