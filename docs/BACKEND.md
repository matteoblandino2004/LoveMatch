# From a local app to a real website with accounts

Right now Wingman is a static site: every profile, swipe and photo lives in the visitor's own
browser. Nothing is sent anywhere. That's why it costs nothing to run and why the privacy policy is
four short paragraphs.

Making it "a real website where people sign up" changes the nature of the thing. This page is the
honest scope.

## The two jobs, separated

**Job one — the address and being findable.** Half a day, ~$12 a year, no engineering risk.

**Job two — accounts, saved profiles, emails and phone numbers.** A real project: a server, a
database, authentication, and a set of legal obligations that start the moment you store a stranger's
phone number. Weeks, not days, and it costs money every month.

Do job one now. Do job two only if you decide you actually want to run a service.

---

# Job one: a .com that people can find

## 1. Buy the domain (yours to do — it needs your card)

~$12/yr at Cloudflare (sells at cost), Porkbun or Namecheap. See [DOMAIN.md](DOMAIN.md) for the
DNS records; it's four A records and one CNAME.

## 2. Point it at the site

Add `docs/CNAME` containing just the domain. The build reads it and rewrites every canonical URL,
share card and sitemap entry to match — nothing else to change.

## 3. Get indexed

Already done for you:

- `sitemap.xml` and `robots.txt`, generated at build time for whatever domain is configured
- `<link rel="canonical">` on every page, so Google indexes one address rather than three
- Open Graph and Twitter card tags, plus a 1200×630 share image, so links unfurl properly
- Real `<title>` and `<meta name="description">` per page

Left for you, once the domain resolves:

1. [Google Search Console](https://search.google.com/search-console) → add your domain → verify
   with the DNS TXT record it gives you → **Sitemaps** → submit `sitemap.xml`
2. [Bing Webmaster Tools](https://www.bing.com/webmasters) → import from Google in one click

Indexing takes days to a few weeks. Searching your exact domain name works almost immediately;
ranking for "matchmaking app" is a different and much longer game.

---

# Job two: accounts and real people's data

## What has to be built

| Piece | What it means |
|---|---|
| **Server + database** | Somewhere for profiles to live. Postgres is the sane default. |
| **Authentication** | Sign up, log in, sessions, password reset, email verification. Use a provider — Clerk, Auth0 or Supabase Auth — rather than writing it. Rolling your own auth is how people get breached. |
| **API** | Every read and write the app does against `localStorage` today becomes a network call, with loading states, failures and retries. |
| **Migration** | `state/store.tsx` currently holds all state locally. It keeps its shape, but each action becomes a request. This is the bulk of the app-side work. |
| **Email and SMS** | Verification, invitations, "you matched" notifications. Resend or Postmark for email; Twilio for SMS. SMS is not free. |
| **Photo storage** | Photos move from IndexedDB to S3 or Cloudflare R2, with signed upload URLs. |
| **Moderation** | Reporting, blocking, and a way to remove someone. Not optional for anything social — Apple requires it, and so does basic duty of care. |

## What it costs

Roughly $0–25/month at zero users, and it scales with them: a small Postgres ($0–20), app hosting
($0–20), object storage (pennies), email (free to ~3k/month), SMS (~$0.008 per message). The free
tiers are real, so a quiet launch is nearly free — but the bill is no longer zero, and it's yours.

## The obligation you take on

The moment the server stores an email address, three things change:

1. **The privacy policy becomes false.** It currently says nothing is collected. It would need
   rewriting: what you store, why, how long, who processes it, how to delete it.
2. **You owe people deletion, export and breach notification** — under GDPR if anyone in Europe
   signs up, CCPA in California. Both apply to individuals, not just companies.
3. **You are storing dating-adjacent personal data**, which is treated as sensitive. A leak is a
   serious event, not an embarrassment.

## The one that's specific to this app

Wingman's whole premise is that **you create a profile for someone else**. Locally that's harmless —
it never leaves your phone. On a server it means *a person who never signed up now has their name,
photo, and possibly phone number in a dating database.* They didn't consent. They may not know.

That is a genuine legal and ethical problem, and it's the thing that would most likely get the
product in trouble — well before the App Store does.

**The design that fixes it**, and which I'd build from day one:

- A profile you create for someone starts as an **unclaimed invite**, not a profile. It is not
  searchable, not swipeable, and not visible to anyone but you.
- The app sends them one message: *"Matteo made you a profile. Take a look?"*
- They claim it → it becomes their account, under their control, and they can edit or delete it.
- They ignore it → **it expires and is deleted, automatically, within 30 days.**
- They say no → deleted immediately, and you can't re-invite them.

This is more work than just saving a row. It's also the difference between a product people find
charming and one they find creepy — and the permission model you already have in the app (they
approve you before you can swipe for them) is exactly the right foundation for it.

## A sane order to build it

1. **Auth and your own profile only.** Sign up, log in, edit yourself. No friends yet.
2. **Photos to object storage.**
3. **Invites and claiming**, per the design above. This is the heart of it — get it right before
   anything else touches another person's data.
4. **Real matching between real users**, replacing the simulated reciprocity.
5. **Moderation**: report, block, remove.
6. **Notifications**: email first, SMS only if you're sure it's worth the cost and the consent.

Phases 1–3 are a genuine milestone: a real, honest product with real accounts. Phases 4–6 are what
make it a dating service.

## What I'd actually recommend

Put the static site on your domain now and let people try it — the local version is a complete,
working app and it needs no backend to be useful or shareable. Use TestFlight to get it in front of
friends. **Then** decide whether you want to run a service, because that's the real question behind
job two, and it's a commitment rather than a feature.
