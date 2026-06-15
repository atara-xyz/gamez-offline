import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 800, height: 1100 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

await page.click('.game-tile:has(.tile-title:text-is("Wordle"))');
await page.click('.difficulty button:text-is("Medium")');
await page.waitForTimeout(400);

// invalid word -> message, no row consumed
await page.keyboard.type('zzzzz');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
const msg = await page.locator('.w-msg').textContent().catch(() => '');
const rowsAfterInvalid = await page.locator('.w-row .w-tile.correct, .w-row .w-tile.present, .w-row .w-tile.absent').count();

// clear and type valid words
for (let i = 0; i < 5; i++) await page.keyboard.press('Backspace');
for (const w of ['crane', 'mouse', 'plant']) {
  await page.keyboard.type(w);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
}
const colored = await page.locator('.w-tile.correct, .w-tile.present, .w-tile.absent').count();
const keysColored = await page.locator('.key.correct, .key.present, .key.absent').count();
await page.screenshot({ path: 'scripts/shots/50-wordle.png', fullPage: true });

console.log('invalid msg:', JSON.stringify(msg), '| tiles colored after invalid (want 0):', rowsAfterInvalid);
console.log('colored tiles after 3 valid guesses:', colored, '| keyboard keys colored:', keysColored);
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
