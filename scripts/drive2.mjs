// Verify the fixes: Flagle hides flags in suggestions; Cities renders shapes.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const OUT = 'scripts/shots';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 1200 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const openGame = async (t) => { await page.click('text=🌐 Geo Games').catch(()=>{}); await page.click(`.game-tile:has(.tile-title:text-is("${t}"))`); await page.waitForTimeout(400); };

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

// Flagle: type into the box -> suggestions must NOT contain flag images
await openGame('Flagle');
await page.fill('.guess-input input', 'ger');
await page.waitForTimeout(250);
const suggFlags = await page.locator('.suggest .flag-img').count();
await page.screenshot({ path: `${OUT}/10-flagle-suggest.png` });
await page.click('.suggest li >> nth=0'); // guess Germany
await page.waitForTimeout(200);
const listFlags = await page.locator('.guess-row .flag-img').count();

// Cities: Australia (was broken) — pick it, guess a city
await openGame('Cities');
await page.fill('.picker-search', 'austral');
await page.waitForTimeout(250);
await page.click('.picker-tile >> nth=0');
await page.waitForTimeout(400);
await page.fill('.guess-input input', 'syd');
await page.waitForTimeout(200);
await page.click('.guess-input button.primary');
await page.waitForTimeout(300);
const cityPathLen = (await page.getAttribute('.citymap path', 'd').catch(()=>''))?.length ?? 0;
await page.screenshot({ path: `${OUT}/11-cities-australia.png` });

// Cities: China (clustered cities -> zoom)
await page.click('.city-head button.ghost'); // change country
await page.waitForTimeout(200);
await page.fill('.picker-search', 'china');
await page.waitForTimeout(250);
await page.click('.picker-tile >> nth=0');
await page.waitForTimeout(400);
await page.fill('.guess-input input', 'be');
await page.waitForTimeout(200);
await page.click('.guess-input button.primary');
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/12-cities-china.png` });

console.log('Flagle suggestion flags (want 0):', suggFlags);
console.log('Flagle guess-list flags (want 0):', listFlags);
console.log('Australia city outline path length (want >5000):', cityPathLen);
console.log('PAGE ERRORS:', errors.length ? errors : 'none');
await browser.close();
