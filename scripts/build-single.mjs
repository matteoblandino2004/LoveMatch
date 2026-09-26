/**
 * Fold the built app into one HTML file that runs from the filesystem.
 * Opening a page over file:// blocks module scripts and asset fetches, so the
 * script and stylesheet have to live inside the document itself.
 */
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const dir = 'dist-single'
const out = 'wingman.html'

// This reads `dist-single/`, which only `vite build --mode single` writes — not
// the ordinary `npm run build`. Run on its own it will happily inline a build
// from last week and report success, so check the age before trusting it.
if (!existsSync(join(dir, 'app.js'))) {
  throw new Error(`no ${dir}/app.js — run \`npm run build:single\`, not this script on its own.`)
}
const builtAt = statSync(join(dir, 'app.js')).mtimeMs
const newestSource = (function newest(from) {
  let latest = 0
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const path = join(from, entry.name)
    latest = Math.max(latest, entry.isDirectory() ? newest(path) : statSync(path).mtimeMs)
  }
  return latest
})('src')
if (newestSource > builtAt) {
  throw new Error(
    `${dir}/app.js is older than src/ — it would inline a stale app. Run \`npm run build:single\`.`,
  )
}

const html = readFileSync(join(dir, 'index.html'), 'utf8')
const js = readFileSync(join(dir, 'app.js'), 'utf8')
const cssPath = join(dir, 'app.css')
const css = existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : ''

// A module script is deferred; a classic one runs the moment it is parsed. So
// the code goes at the end of the body, after #root exists, rather than in the
// head where React would find nothing to mount on.
const page = html
  .replace(/\s*<script[^>]*src="[^"]*app\.js"[^>]*><\/script>/, '')
  .replace(/<link[^>]*href="[^"]*app\.css"[^>]*>/, () => `<style>\n${css}\n</style>`)
  .replace('</body>', `  <script>\n${js}\n  </script>\n  </body>`)

// Only the tags matter — the bundled code itself may well mention those names.
for (const ref of ['src="./app.js"', 'href="./app.css"', 'type="module"']) {
  if (page.includes(ref)) {
    throw new Error(`${ref} survived inlining — the file would not open offline.`)
  }
}

writeFileSync(out, page)
const kb = (Buffer.byteLength(page) / 1024).toFixed(0)
console.log(`${out} — ${kb} KB, self-contained`)
