# The website: how it's published, and how to fix a deploy

## Which branch is allowed to publish

Pages remembers the branch it was first enabled from. Here that was
`claude/matchmaking-app-friends-family-o191bu`, because that's the branch the workflow first ran
on — so deploys from `main` get refused with:

```
Invalid deployment branch and no branch protection rules set in the environment.
Deployments are only allowed from claude/matchmaking-app-friends-family-o191bu
```

The counter-intuitive part is that setting the `github-pages` environment to **No restriction**
makes this *worse*, not better. With no rule in the environment, GitHub falls back to that
remembered Pages source branch. An explicit rule is what overrides it.

**The fix:** Settings → **Environments → `github-pages`** → *Deployment branches and tags* →
**Selected branches and tags** → **Add deployment branch or tag rule** → `main` → Add rule.

Then **Actions → Deploy website → Run workflow → main**.

If that still refuses, rebind the Pages source instead: Settings → **Pages** → Source →
*Deploy from a branch* → `main` → Save → then switch Source back to **GitHub Actions**. That
rewrites the remembered branch.

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

## Don't put a landing page at the repository root

`index.html` at the root is **Vite's entry point for the app**, not a spare file. Replacing it (I
tried, as a fallback for a misdiagnosed 404) makes `npm run build` compile the landing page instead
of the app: `dist/` comes out with no JavaScript and `wingman.html` shrinks from ~336 KB to 4 KB.
The build still "succeeds", which is what makes it easy to miss — check the size.

## Checking a deploy

**Actions** tab → **Deploy website**. A green tick means published; give the CDN a minute, then
hard-refresh (Ctrl-F5) because GitHub caches the 404 aggressively.

A run that fails in ~3 seconds with no steps executed is the `github-pages` environment rejecting
the job — almost always because the Source setting is still on "Deploy from a branch".
