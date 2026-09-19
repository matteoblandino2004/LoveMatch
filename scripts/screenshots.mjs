/**
 * Drive the real app and capture App Store screenshots at 1290x2796.
 * Needs a preview server: `npm run build && npm run preview` in another shell.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

// 6.7" iPhone: 1290 x 2796 — the size App Store Connect asks for.
const OUT = 'appstore/screenshots'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 430, height: 932 },
  deviceScaleFactor: 3,
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
await page.click('nav button:has-text("Occasions")')
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

await browser.close()
console.log('done')
