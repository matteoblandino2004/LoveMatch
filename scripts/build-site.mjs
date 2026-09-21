/**
 * Assemble the public website: the landing/support/privacy pages, plus a
 * playable build of the app itself at /app/ and the one-file download.
 */
import { cpSync, mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'node:fs'

const OUT = 'site'

/**
 * Where the site will live. Once docs/CNAME holds a custom domain, every
 * canonical URL, share card and sitemap entry follows it with no other edits.
 */
const BASE = existsSync('docs/CNAME')
  ? `https://${readFileSync('docs/CNAME', 'utf8').trim()}`
  : 'https://matteoblandino2004.github.io/LoveMatch'

/** Pages worth putting in front of a search engine. */
const PAGES = [
  { path: '', title: 'Wingman — be the reason they finally meet', priority: '1.0' },
  { path: 'support.html', title: 'Wingman — Support', priority: '0.5' },
  { path: 'privacy.html', title: 'Wingman — Privacy Policy', priority: '0.3' },
]

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

// Canonical and social tags, so a shared link looks like something and search
// engines index one address rather than several.
for (const page of PAGES) {
  const file = `${OUT}/${page.path || 'index.html'}`
  if (!existsSync(file)) continue
  const url = `${BASE}/${page.path}`
  const html = readFileSync(file, 'utf8')
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ??
    'A matchmaking app you use for other people.'

  const tags = [
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Wingman" />`,
    `<meta property="og:title" content="${page.title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${BASE}/og.png" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${page.title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${BASE}/og.png" />`,
    `<meta name="theme-color" content="#100810" />`,
  ].map((tag) => `    ${tag}`).join('\n')

  writeFileSync(file, html.replace('</head>', `${tags}\n  </head>`))
}

const today = new Date().toISOString().slice(0, 10)
writeFileSync(
  `${OUT}/sitemap.xml`,
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    PAGES.map(
      (page) =>
        `  <url>\n    <loc>${BASE}/${page.path}</loc>\n    <lastmod>${today}</lastmod>\n` +
        `    <priority>${page.priority}</priority>\n  </url>`,
    ).join('\n') +
    `\n</urlset>\n`,
)

writeFileSync(
  `${OUT}/robots.txt`,
  `User-agent: *\nAllow: /\n\nSitemap: ${BASE}/sitemap.xml\n`,
)

console.log(`${OUT}/ assembled for ${BASE} — landing, app, privacy, support, sitemap`)
