/**
 * Drive the real app and capture App Store screenshots.
 * Needs a preview server: `npm run build && npm run preview` in another shell.
 *
 * App Store Connect renames its screenshot slots every year or two and rejects
 * anything off by a pixel, so the size is a parameter rather than a constant:
 *
 *   SHOT_W=1320 SHOT_H=2868 npm run screenshots
 *
 * Defaults to 1320x2868. Both numbers must divide by 3 — the device scale
 * factor — or the capture comes out a pixel short and Apple refuses it.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const W = Number(process.env.SHOT_W ?? 1320)
const H = Number(process.env.SHOT_H ?? 2868)
const SCALE = 3
if (W % SCALE || H % SCALE) {
  throw new Error(`${W}x${H} does not divide by ${SCALE} — pick a size that does.`)
}
const OUT = process.env.SHOT_OUT ?? `appstore/screenshots-${W}x${H}`
mkdirSync(OUT, { recursive: true })
console.log(`capturing ${W}x${H} into ${OUT}/`)
const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: W / SCALE, height: H / SCALE },
  deviceScaleFactor: SCALE,
})
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` })

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
await page.click('text=I\'m 18 or older')
await page.fill('#who', 'John')
await page.click('text=Just show me — load a sample family')
await page.waitForTimeout(900)
await shot('1-swipe')

// Score breakdown
await page.click('.deck-card >> nth=-1', { position: { x: 200, y: 380 } })
await page.waitForTimeout(700)
await shot('2-compatibility')
await page.keyboard.press('Escape')
await page.waitForTimeout(400)

// A match
for (let i = 0; i < 6; i++) {
  const like = await page.$('button[aria-label="Like"]')
  if (!like) break
  await like.click()
  await page.waitForTimeout(500)
  if (await page.isVisible('.celebrate')) { await shot('3-match'); break }
}
if (await page.isVisible('.celebrate')) { await page.click('.celebrate .btn-ghost'); await page.waitForTimeout(400) }

// Occasions
await page.click('nav button:has-text("Events")')
await page.waitForTimeout(700)
await shot('4-occasions')

// Account switcher
await page.click('.topbar button >> nth=0')
await page.waitForTimeout(700)
await shot('5-accounts')
await page.keyboard.press('Escape')
await page.waitForTimeout(400)

// People, with family and friends
await page.click('nav button:has-text("People")')
await page.waitForTimeout(700)
await shot('6-people')

// What your friends think: pick someone for Maya, then answer as Maya.
await page.click('nav button:has-text("Swipe")')
await page.waitForTimeout(500)
await page.click('button.chip:has-text("Maya")')
await page.waitForTimeout(500)
await page.click('button[aria-label="Like"]')
await page.waitForTimeout(700)
await page.click('.topbar button >> nth=0')
await page.waitForTimeout(400)
await page.click('.sheet .row:has-text("Maya")')
await page.waitForTimeout(600)
await page.click('nav button:has-text("Picks")')
await page.waitForTimeout(800)
await shot('7-picks')

await browser.close()
console.log('done')
