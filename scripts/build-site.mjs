/**
 * Assemble the public website: the landing/support/privacy pages, plus a
 * playable build of the app itself at /app/ and the one-file download.
 */
import { cpSync, mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'node:fs'

const OUT = 'site'

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

// Landing, support, privacy, stylesheet, .nojekyll and a CNAME if one is set.
cpSync('docs', OUT, {
  recursive: true,
  filter: (src) => !src.endsWith('.md'),
})

// The real app, served from /app/. Vite builds with base './' so it works
// from a subdirectory without a rebuild.
if (!existsSync('dist/index.html')) {
  throw new Error('dist/ is missing — run `npm run build` first')
}
cpSync('dist', `${OUT}/app`, { recursive: true })

// The single-file version, offered as a download.
if (existsSync('wingman.html')) {
  cpSync('wingman.html', `${OUT}/wingman.html`)
}

// A 404 that sends people somewhere useful instead of a GitHub error page.
writeFileSync(
  `${OUT}/404.html`,
  readFileSync('docs/index.html', 'utf8').replace(
    '<h1>Be the reason they finally meet.</h1>',
    '<h1>That page doesn\'t exist.</h1>',
  ),
)

console.log(`${OUT}/ assembled — landing, app, privacy, support`)
