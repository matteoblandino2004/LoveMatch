# Building the backend: a running log

The plan is in [BACKEND.md](BACKEND.md). This page tracks what is actually done,
and what is waiting on you.

**The app still runs with no server.** `src/lib/supabase.ts` returns `null` when the
keys are missing, and every caller treats that as "stay local". One build runs both
ways, so the half-finished backend can never break the version in the App Store.

## Status

| Phase | State |
|---|---|
| 1. Auth and profiles on the server | schema written, not yet applied |
| 2. Photos to object storage | not started |
| 3. Invites and claiming | schema written (`claim_state`), app side not started |
| 4. Wingman grants across accounts | not started |
| 5. Real matching | not started |
| 6. Messaging and push | not started |
| 7. Report, block, remove | not started |

## What is waiting on you

**Create a Supabase project.** [supabase.com](https://supabase.com) → New project. Free
tier. Pick a region near your users; US East is right for New York.

Then two things:

1. **Run the migration.** Supabase dashboard → SQL Editor → New query → paste the whole
   of `supabase/migrations/0001_identity_and_profiles.sql` → Run. It should report
   success with no rows.
2. **Give the app its keys.** Project Settings → API. Copy `.env.example` to `.env.local`
   and fill in the Project URL and the `anon` / `public` key.

The anon key is designed to ship inside the app — it grants nothing on its own, because
every table is behind row-level security. The `service_role` key is the opposite: it
bypasses RLS entirely. It must never go in `.env.local`, in this repo, or in a chat.

## What it costs

Read off supabase.com/pricing on 16 November 2026. Check it again before you pay — these
move.

**Free — $0/month.** 50,000 monthly active users, 500 MB database, 1 GB file storage,
5 GB egress, unlimited API requests. Auth is included (unlimited users, OAuth, multi-factor).
Realtime is included: 200 concurrent connections, 2 million messages a month. That is
genuinely enough to build the whole thing and launch to a few hundred people.

Two catches, both of which matter:

- **Free projects are paused after 1 week of inactivity.** A paused project means the app
  is down until someone clicks unpause. Fine while building, fatal in production.
- Limit of 2 active projects.

**Pro — from $25/month.** 100,000 MAU (then $0.00325 each), 8 GB disk, 100 GB file storage,
250 GB egress, email support, daily backups kept 7 days. No pausing. This is the real
number for a live app, and it is the bill you take on the day strangers rely on it.

Everything else:

| | |
|---|---|
| Apple Developer | $99/yr — already paying |
| Push notifications (APNs) | free, included with the developer account |
| Custom SMTP for auth emails | included on Free |
| A domain | ~$12/yr, optional |

**So: $0 while building, $25/month the day it goes live.**

## The consent design, in one paragraph

Locally, making a profile for your sister is harmless — it never leaves your phone. On a
server it means a real person's name and face sit in a dating database they never signed
up for. So `profiles.claim_state` starts at `unclaimed`: the row is visible only to its
author, is not swipeable, is not searchable, and the trigger sets `expires_at` 30 days
out. She claims it and it becomes hers — `owner_id` set, author locked out of editing.
She declines and the row is kept as a tombstone so she cannot be re-invited. She ignores
it and it is deleted.

This is the difference between a product people find charming and one they find creepy,
and it is why phase 3 is not optional.

## What changes in the App Store listing when this ships

Both of these are currently true and would become false:

- **App Privacy: Data Not Collected.** Would need rewriting to declare contact info,
  user content, identifiers and their purposes.
- **The privacy policy** says nothing leaves the device.

And Guideline 1.2 applies in full the moment two strangers can message: report, block,
published contact info, and a 24-hour commitment on reported content. That is phase 7,
and the version cannot ship without it.
