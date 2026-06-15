// Rigorous offline test: app shell offline + on-demand photo download offline.
import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
// wait for app-shell precache to finish
let chip = '';
for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(1000);
  chip = await page.locator('.offline-chip').textContent().catch(() => '');
  if (!chip.includes('Saving')) break;
}
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// --- TEST 1: app shell + core games work fully offline ---
await ctx.setOffline(true);
await page.reload({ waitUntil: 'domcontentloaded' }).catch((e) => errors.push('reload offline: ' + e.message));
await page.waitForTimeout(1200);
const tiles = await page.locator('.game-tile').count();
// open a non-photo game offline (Globle) and confirm the map renders
await page.click('.game-tile:has(.tile-title:text-is("Globle"))').catch(() => {});
await page.waitForTimeout(600);
const mapPaths = await page.locator('.worldmap path').count();
// open Wordle offline
await page.click('text=🌐 Geo Games').catch(() => {});
await page.click('.game-tile:has(.tile-title:text-is("Wordle"))').catch(() => {});
await page.waitForTimeout(400);
const wordleBoard = await page.locator('.w-tile').count();
console.log('OFFLINE app shell: tiles=', tiles, 'globle map paths=', mapPaths, 'wordle tiles=', wordleBoard);

// --- TEST 2: photo download then offline photo load ---
await ctx.setOffline(false);
await page.click('text=🌐 Geo Games').catch(() => {});
await page.waitForTimeout(300);
// trigger the photo download via the offline popup
await page.locator('.offline-chip').click();
await page.waitForTimeout(300);
const hasBtn = await page.locator('.op-photos .primary, .op-photos').count();
// call the download directly + wait until localStorage flag set (faster than clicking through 2200)
const total = await page.evaluate(async () => {
  // mimic the component's downloader for the test
  const base = '/';
  // gather a SAMPLE of photo paths from the page's module isn't trivial; instead
  // fetch the manifest-derived list by reading from window if exposed; fallback:
  return null;
});
// Instead: click the real button and let it run (cap the wait)
await page.locator('.op-photos .primary').click().catch(() => {});
let done = false;
for (let i = 0; i < 90; i++) {
  await page.waitForTimeout(2000);
  const txt = await page.locator('.op-photos').textContent().catch(() => '');
  if (txt.includes('saved for offline')) { done = true; break; }
}
console.log('photo download finished:', done);

// now go offline and open an Animals round; check a photo actually renders
await ctx.setOffline(true);
await page.click('text=🌐 Geo Games').catch(() => {});
await page.click('.game-tile:has(.tile-title:text-is("Animals"))').catch(() => {});
await page.waitForTimeout(800);
const imgLoaded = await page.locator('.photo-stage img').first().evaluate((i) => i.complete && i.naturalWidth > 0).catch(() => false);
const chipFinal = await page.locator('.offline-chip').textContent().catch(() => '');
console.log('OFFLINE Animals photo loaded:', imgLoaded, '| chip:', JSON.stringify(chipFinal));
console.log('errors:', errors.length ? errors.slice(0, 5) : 'none');
await browser.close();
