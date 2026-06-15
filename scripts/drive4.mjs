import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

// Animals on Hard (1 image, hints reveal late)
await page.click('.game-tile:has(.tile-title:text-is("Animals"))');
await page.waitForTimeout(700);
await page.click('.difficulty button:text-is("Hard")');
await page.waitForTimeout(700);
const startImgs = await page.locator('.photo-stage img').count();
const imgLoaded = await page.locator('.photo-stage img').first().evaluate((i) => i.naturalWidth > 0).catch(()=>false);
await page.screenshot({ path: 'scripts/shots/30-animals-hard-start.png', fullPage: true });

// make 3 wrong guesses to reveal more photos + taxonomy hints
for (const g of ['Lion', 'Tiger', 'Wolverine']) {
  await page.fill('.guess-input input', g);
  await page.waitForTimeout(150);
  await page.click('.guess-input button.primary');
  await page.waitForTimeout(300);
}
const imgsAfter = await page.locator('.photo-stage img').count();
const hints = await page.locator('.img-hint').allTextContents();
await page.screenshot({ path: 'scripts/shots/31-animals-hints.png', fullPage: true });

// solve by reading the answer from hints is not possible; just exhaust guesses to see fact card
for (const g of ['Coyote', 'Moose', 'Bison']) {
  await page.fill('.guess-input input', g);
  await page.waitForTimeout(120);
  await page.click('.guess-input button.primary');
  await page.waitForTimeout(250);
}
await page.waitForTimeout(300);
const factVisible = await page.locator('.img-factcard').count();
const stripImgs = await page.locator('.photo-strip img').count();
await page.screenshot({ path: 'scripts/shots/32-animals-factcard.png', fullPage: true });

console.log('Hard start images (want 1):', startImgs, 'loaded:', imgLoaded);
console.log('images after 3 wrong guesses:', imgsAfter);
console.log('taxonomy hints shown:', hints);
console.log('fact card shown:', factVisible, 'strip images:', stripImgs);
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
