import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--ignore-certificate-errors'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 1500 }, ignoreHTTPSErrors: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('https://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// menu shows a Basketball category with 4 tiles
const cats = await page.locator('.cat-title').allTextContents();
const nbaTiles = await page.locator('.cat-section:has(.cat-title:text-is("Basketball")) .game-tile').count();
await page.screenshot({ path: 'scripts/shots/70-menu-grouped.png', fullPage: true });

const open = async (t) => { await page.click('text=🌐 Geo Games').catch(()=>{}); await page.click(`.game-tile:has(.tile-title:text-is("${t}"))`); await page.waitForTimeout(500); };

// NBA Logos
await open('NBA Logos');
const logoLoaded = await page.locator('.guess-logo').evaluate((i) => i.complete && i.naturalWidth > 0).catch(() => false);
await page.fill('.guess-input input', 'lakers');
await page.waitForTimeout(200);
await page.click('.guess-input button.primary');
await page.waitForTimeout(300);
await page.screenshot({ path: 'scripts/shots/71-nba-logos.png', fullPage: true });

// Name the NBA
await open('Name the NBA');
const slots = await page.locator('.team-slot').count();
for (const tm of ['celtics', 'lakers', 'heat']) {
  await page.fill('.guess-input input', tm);
  await page.waitForTimeout(150);
  await page.click('.guess-input button.primary');
  await page.waitForTimeout(200);
}
const got = await page.locator('.team-slot.got').count();
const countTxt = await page.locator('.nameall-head .count').textContent();
await page.screenshot({ path: 'scripts/shots/72-nba-nameall.png', fullPage: true });

// NBA Clues
await open('NBA Clues');
await page.fill('.guess-input input', 'spurs');
await page.waitForTimeout(150);
await page.click('.guess-input button.primary');
await page.waitForTimeout(300);
const clues = await page.locator('.clue-item').count();
await page.screenshot({ path: 'scripts/shots/73-nba-clues.png', fullPage: true });

// NBA Colors
await open('NBA Colors');
const swatches = await page.locator('.color-stage .swatch').count();
await page.screenshot({ path: 'scripts/shots/74-nba-colors.png', fullPage: true });

console.log('categories:', cats, '| basketball tiles:', nbaTiles);
console.log('logo loaded:', logoLoaded);
console.log('nameall slots:', slots, '| got after 3:', got, '| count:', countTxt);
console.log('clues shown:', clues, '| color swatches:', swatches);
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
