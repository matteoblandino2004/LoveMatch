# Shipping LoveMatch to the App Store

The iOS project is already in this repo at `ios/`. It's a [Capacitor](https://capacitorjs.com)
wrapper: the React app you run with `npm run dev` is the same code that runs inside the native
shell, so there's one codebase, not two.

Everything below happens on a Mac with Xcode. The project was generated on Linux, so the first
thing you do on your Mac is let Xcode resolve the Swift packages — that's automatic when you open it.

## One-time setup

1. Install Xcode from the Mac App Store, then open it once and accept the licence.
2. Clone this repo and install dependencies:
   ```bash
   npm install
   ```
3. Build the web app and open Xcode:
   ```bash
   npm run ios
   ```
   That runs `vite build`, copies `dist/` into the native project, syncs the plugins and opens
   `ios/App/App.xcworkspace`.

## Signing with your Apple Developer account

In Xcode, select the **App** target → **Signing & Capabilities**:

- Tick **Automatically manage signing**.
- **Team**: your Apple Developer team.
- **Bundle Identifier**: currently `com.lovematch.app`. Change it to something you own in reverse
  domain form, e.g. `com.yourname.lovematch`. If you change it here, change `appId` in
  `capacitor.config.ts` to match so future syncs don't fight you.

That's all the signing this app needs — no push notifications, no iCloud, no App Groups, because
everything runs on the device.

## Running it

- **Simulator**: pick any iPhone in the scheme dropdown and press ⌘R.
- **Your own phone**: plug it in, select it, press ⌘R. First run asks you to trust the developer
  certificate on the phone under Settings → General → VPN & Device Management.

After changing web code, re-run `npm run ios:sync` (build + copy) and press ⌘R again. For a faster
loop while developing UI, just use `npm run dev` in the browser — the app is the same.

## What's already configured

| Thing | Where | Value |
|---|---|---|
| Display name | `ios/App/App/Info.plist` | LoveMatch |
| Bundle id | Xcode target / `capacitor.config.ts` | `com.lovematch.app` |
| Orientation | `Info.plist` | Portrait only |
| Appearance | `Info.plist` | `UIUserInterfaceStyle: Dark` |
| Photo permission | `Info.plist` | `NSPhotoLibraryUsageDescription` |
| Camera permission | `Info.plist` | `NSCameraUsageDescription` |
| Encryption declaration | `Info.plist` | `ITSAppUsesNonExemptEncryption: false` |
| App icon | `ios/App/App/Assets.xcassets/AppIcon.appiconset` | 1024×1024, generated |
| Launch screen | `Assets.xcassets/Splash.imageset` | 2732×2732, generated |
| Status bar | `src/lib/native.ts` | Light glyphs on `#100810` |
| Haptics | `src/lib/native.ts` | Medium tap on a swipe, success buzz on a match |

The permission strings matter: the photo picker is a plain `<input type="file">`, and iOS still
requires the usage descriptions before WKWebView will open the library or the camera. Apple rejects
builds that ask for access without them.

## TestFlight

1. Bump the version: Xcode target → **General** → Version (e.g. `1.0.0`) and Build (`1`, then `2`…).
   Every upload needs a unique build number.
2. **Product → Destination → Any iOS Device (arm64)**, then **Product → Archive**.
3. In the Organizer window that opens: **Distribute App → App Store Connect → Upload**.
4. In [App Store Connect](https://appstoreconnect.apple.com), create the app record first if you
   haven't (Platform iOS, the same bundle id, an SKU of your choosing).
5. The build appears under TestFlight after processing (10–30 minutes). Add yourself as an internal
   tester and install it through the TestFlight app.

## Submitting for review

A few things App Review will specifically care about for this app:

- **Age rating.** Dating apps rate 17+. Answer the questionnaire honestly; picking anything lower
  gets rejected.
- **App Privacy.** This build collects nothing and transmits nothing — no analytics, no accounts, no
  network calls at all. Answer "Data Not Collected". Photos and profiles live in the device's
  IndexedDB and localStorage. Say so in the review notes; it's unusual enough that reviewers check.
- **Account deletion.** Apps with accounts must offer in-app deletion. There are no accounts here,
  and **Settings → Reset everything** wipes all local data, which covers the spirit of it.
- **Demo content.** Reviewers need to see the app working. The welcome screen's "load a sample
  family" button fills the app with profiles instantly — point them at it in the review notes, or
  they may report a blank app.
- **Screenshots.** You need 6.7" screenshots at minimum. Run the simulator on an iPhone 15 Pro Max,
  load the sample family, and grab the swipe deck, a score breakdown, a match, a matchmaker's circle
  and the occasions screen.
- **Privacy policy URL.** Required for every app. A short page saying "all data stays on the
  device, nothing is collected or transmitted" is accurate and sufficient.

### Review notes worth pasting

> LoveMatch is an offline dating app for matchmakers: you build profiles for friends and family,
> swipe on their behalf, and find them dates for specific occasions like a wedding or a double date. It has no server, no accounts and makes no network requests — all profiles,
> photos, swipes and matches are stored locally on the device. The other profiles in the app are
> fictional sample data bundled with the build. To see the app populated, tap "Just show me — load a
> sample family" on the welcome screen.

## If you later add a backend

The current app is deliberately device-local. Real matchmaking between separate users would need a
server, and that changes the App Store answers above (data collection, account deletion, moderation
and a way to report users — Apple requires user-generated-content safeguards for anything social).
Worth planning for before you build it, not after.

## Troubleshooting

- **"No such module 'Capacitor'"** — Xcode hasn't resolved the Swift packages yet.
  File → Packages → Resolve Package Versions, then clean (⇧⌘K) and rebuild.
- **White screen on launch** — `dist/` wasn't copied. Run `npm run ios:sync`.
- **Changes don't show up** — same thing: the native app serves the built bundle, not the dev server.
- **Photo picker does nothing on device** — check the two usage strings are still in `Info.plist`;
  a regenerated project overwrites them.
