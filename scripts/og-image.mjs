/** The 1200x630 card that shows when the site is shared or linked. */
import { chromium } from 'playwright'

const html = `<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;width:1200px;height:630px;overflow:hidden}
  .bg{width:1200px;height:630px;position:relative;display:flex;flex-direction:column;
    justify-content:center;padding:0 88px;box-sizing:border-box;
    font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
    background:
      radial-gradient(900px 600px at 12% 0%, rgba(255,77,121,.34), transparent 60%),
      radial-gradient(800px 600px at 92% 100%, rgba(181,123,255,.26), transparent 62%),
      #100810;}
  .mark{font-size:40px;font-weight:800;letter-spacing:-.02em;color:#ffb3c4;margin-bottom:26px}
  h1{margin:0;font-size:82px;line-height:1.02;letter-spacing:-.035em;font-weight:800;
    background:linear-gradient(135deg,#ff4d79,#ff7a59 55%,#ffc46b);
    -webkit-background-clip:text;background-clip:text;color:transparent;max-width:900px}
  p{margin:30px 0 0;font-size:31px;line-height:1.4;color:#c8b9c4;max-width:860px}
</style>
<div class="bg">
  <div class="mark">🪽 Wingman</div>
  <h1>Be the reason they finally meet.</h1>
  <p>A matchmaking app you use for other people — swipe for a friend, with their permission.</p>
</div>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await page.setContent(html)
await page.screenshot({ path: 'docs/og.png' })
await browser.close()
console.log('docs/og.png — 1200x630')
