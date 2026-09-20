# When you get a Mac: the whole iOS side, start to finish

Everything in this repo is ready. Nothing here needs to be built or decided in advance — this page
is the complete list of what to do on the day, in order. Budget about an hour for the first run,
most of which is Xcode downloading.

## Before you start

- **A Mac** running macOS Sonoma or later.
- **Xcode** from the Mac App Store (free, ~8 GB, slow — start this download first).
- **Node.js 22** from [nodejs.org](https://nodejs.org) (the LTS installer).
- Your **Apple Developer** account (you have this).

## 1. Get the code and check it

Open **Terminal** (⌘-Space, type "terminal") and paste these one at a time:

```bash
git clone https://github.com/matteoblandino2004/LoveMatch.git
cd LoveMatch
git checkout claude/matchmaking-app-friends-family-o191bu
npm install
npm run preflight
```

`preflight` should print 19 green ticks and `Ready to archive.` If anything is red, it tells you
what and why — fix that before going further.

> If the work has since been merged into `main`, skip the `git checkout` line.

## 2. Register the App ID

At [developer.apple.com](https://developer.apple.com/account/resources/identifiers/list):

1. **Certificates, Identifiers & Profiles → Identifiers → +**
2. **App IDs → App → Continue**
3. Description: `Wingman`. Bundle ID: **Explicit** → `com.matteoblandino.wingman`
4. Capabilities: leave everything unticked — this app needs none.
5. **Continue → Register**

## 3. Create the App Store Connect record

At [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **My Apps → + → New App**:

| Field | Value |
|---|---|
| Platform | iOS |
| Name | Wingman |
| Primary language | English (U.S.) |
| Bundle ID | com.matteoblandino.wingman |
| SKU | wingman-001 |
| User access | Full Access |

## 4. Open it in Xcode

```bash
npm run ios
```

That builds the web app, copies it into the native project, and opens Xcode. First launch will ask
to install extra components — say yes, and wait for the package resolution spinner in the top bar
to finish.

**Sign in once:** Xcode menu → **Settings → Accounts → + → Apple ID** → sign in.

**Set the team:** blue **App** icon at the top of the left sidebar → TARGETS **App** →
**Signing & Capabilities** → tick **Automatically manage signing** → **Team**: your name.

The bundle id is already `com.matteoblandino.wingman` — don't change it.

## 5. Run it on your own phone first

Plug the iPhone in, unlock it, tap **Trust**. In Xcode's toolbar, click the device dropdown (next
to "App") and pick your iPhone. Press **⌘R**.

First time only, the phone will refuse to open it: **Settings → General → VPN & Device Management →
your developer certificate → Trust**.

Try it properly here — photos, the account switcher, an occasion. This is the last easy chance to
catch something before Apple sees it.

## 6. Archive and upload

1. Toolbar device dropdown → **Any iOS Device (arm64)**. *(Archive stays greyed out until you do
   this — it's the single most common sticking point.)*
2. Menu → **Product → Archive**. Two to five minutes.
3. The **Organizer** window opens on its own → select the archive → **Distribute App**
4. **App Store Connect → Upload → Next** through the defaults → **Upload**

## 7. TestFlight

Back in App Store Connect → your app → **TestFlight** tab. The build shows "Processing" for
10–30 minutes, then becomes available.

- **Internal Testing → + → add yourself.** No review needed. Install the **TestFlight** app on your
  phone and it's there.
- **External Testing** for friends: create a group, add the build, submit for **Beta App Review**
  (usually a day), then share the public link with anyone.

Paste this into "What to Test":

> Tap "I'm 18 or older", then "Just show me — load a sample family" to fill the app with example
> profiles. Worth trying: tap a card for the compatibility breakdown; Occasions → "Find someone for
> this"; the avatar top-right to switch accounts and approve a wingman request; add a photo.
> Everything is stored on your phone — Settings → Reset everything wipes it.

## 8. Only if you're going for the public App Store

Read [APP-STORE.md](APP-STORE.md) first — there's a real rejection risk to understand before you
submit, and it is not about anything you've done wrong. Everything you'd need to fill the listing
in (screenshots, description, keywords, review notes, privacy and support URLs) is already written.

## If you get stuck

| Symptom | Cause |
|---|---|
| **Product → Archive** is greyed out | Destination isn't "Any iOS Device (arm64)" |
| **Team** dropdown is empty | Apple ID not added in Xcode → Settings → Accounts |
| "No such module 'Capacitor'" | Packages not resolved: File → Packages → Resolve Package Versions, then ⇧⌘K |
| White screen when the app launches | `dist/` wasn't copied — run `npm run ios:sync` |
| Changes don't appear | The app runs the bundled build, not the dev server — `npm run ios:sync` again |
