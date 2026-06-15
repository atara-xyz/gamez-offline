import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 1300 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500); // let SW install + precache

// Offline indicator
const chipText = await page.locator('.offline-chip').textContent().catch(() => 'MISSING');
await page.locator('.offline-chip').click().catch(()=>{});
await page.waitForTimeout(300);
const popText = await page.locator('.offline-pop').textContent().catch(() => '');
await page.screenshot({ path: 'scripts/shots/40-offline.png' });
await page.locator('.offline-chip').click().catch(()=>{}); // close

// Cities: pick a country, check target marker + facts
await page.click('.game-tile:has(.tile-title:text-is("Cities"))');
await page.waitForTimeout(400);
await page.fill('.picker-search', 'germany');
await page.waitForTimeout(250);
await page.click('.picker-tile >> nth=0');
await page.waitForTimeout(400);
const targetPin = await page.locator('.target-pin').count();
await page.screenshot({ path: 'scripts/shots/41-cities-marker.png', fullPage: true });
// wrong guess to reveal a fact
await page.fill('.guess-input input', 'ber'); // could be Berlin (maybe right); use a definitely-wrong if Berlin
await page.waitForTimeout(150);
await page.click('.guess-input button.primary');
await page.waitForTimeout(300);
const facts1 = await page.locator('.img-hint').count();
await page.fill('.guess-input input', 'mun');
await page.waitForTimeout(150);
await page.click('.guess-input button.primary');
await page.waitForTimeout(300);
const facts2 = await page.locator('.img-hint').allTextContents();
await page.screenshot({ path: 'scripts/shots/42-cities-facts.png', fullPage: true });

console.log('offline chip:', JSON.stringify(chipText), '| pop has text:', popText.length > 10);
console.log('cities target marker present:', targetPin);
console.log('facts after guesses:', facts2);
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
