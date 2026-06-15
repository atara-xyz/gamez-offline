// Playwright smoke-drive: opens each game, plays a move, screenshots it.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const URL = 'http://localhost:4173/';
const OUT = 'scripts/shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));

const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });
const openGame = async (title) => {
  await page.click('text=🌐 Geo Games').catch(() => {});
  await page.click(`.game-tile:has(.tile-title:text-is("${title}"))`);
  await page.waitForTimeout(400);
};

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await shot('00-menu');

// --- Worldle (easy: expect map + direction arrows) ---
await openGame('Worldle');
// difficulty Easy
await page.click('.difficulty button:text-is("Easy")');
await page.waitForTimeout(300);
for (const c of ['France', 'Brazil', 'India']) {
  await page.fill('.guess-input input', c);
  await page.waitForTimeout(150);
  await page.click('.guess-input button.primary');
  await page.waitForTimeout(200);
}
await shot('01-worldle-easy');

// --- Flagle (verify real flag image renders) ---
await openGame('Flagle');
await page.waitForTimeout(300);
const flagSrc = await page.getAttribute('.flag-big', 'src').catch(() => null);
const flagBox = await page.locator('.flag-big').boundingBox().catch(() => null);
await shot('02-flagle');

// --- Capitals ---
await openGame('Capitals');
await page.waitForTimeout(300);
await page.click('.choice >> nth=0');
await page.waitForTimeout(300);
await shot('03-capitals');

// --- Cities (picker -> dive) ---
await openGame('Cities');
await page.waitForTimeout(300);
await shot('04-cities-picker');
await page.click('.picker-tile >> nth=0');
await page.waitForTimeout(400);
await page.fill('.guess-input input', '');
// type two letters and pick first suggestion
await page.fill('.guess-input input', 'a');
await page.waitForTimeout(200);
await page.click('.guess-input button.primary');
await page.waitForTimeout(300);
await shot('05-cities-play');

console.log('FLAG src:', flagSrc, 'box:', JSON.stringify(flagBox));
console.log('CONSOLE ERRORS:', errors.length ? errors.slice(0, 10) : 'none');
await browser.close();
