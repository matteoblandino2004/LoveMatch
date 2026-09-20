# The website: how it's published, and how to fix a 404

## The one setting that matters

Repo → **Settings → Pages → Source** must be **GitHub Actions**.

If it says *Deploy from a branch*, GitHub ignores what the workflow publishes and serves raw files
from a branch instead. That's what produces the "404 — File not found. The site configured at this
address does not contain the requested file" page: Pages is switched on, but it's looking in a
place with no `index.html`.

Change that dropdown to **GitHub Actions** and the next deploy goes live. To trigger one without
pushing: **Actions → Deploy website → Run workflow → main**.

## What gets published

`npm run build:site` assembles the `site/` folder that gets deployed:

| Path | What it is |
|---|---|
| `/` | Landing page (`docs/index.html`) |
| `/app/` | The full app, playable in a browser |
| `/wingman.html` | The single-file build, for downloading |
| `/privacy.html` | Privacy policy — the URL Apple requires |
| `/support.html` | Support page — the other URL Apple requires |
| `/404.html` | Sends people home instead of to a GitHub error page |

The workflow runs on every push to `main`, so the site tracks the code.

## The belt-and-braces fallback

There's also an `index.html` at the repository root. It never serves when the source is GitHub
Actions — it exists so that *if* Pages is set to "Deploy from a branch" at the root, visitors still
get a landing page and a working link to `wingman.html` (which is committed) rather than a 404.

So the worst case is a slightly reduced site, not a broken one.

## Checking a deploy

**Actions** tab → **Deploy website**. A green tick means published; give the CDN a minute, then
hard-refresh (Ctrl-F5) because GitHub caches the 404 aggressively.

A run that fails in ~3 seconds with no steps executed is the `github-pages` environment rejecting
the job — almost always because the Source setting is still on "Deploy from a branch".
