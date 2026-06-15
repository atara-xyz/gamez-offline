import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 1300 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const openGame = async (t) => { await page.click('text=🌐 Geo Games').catch(()=>{}); await page.click(`.game-tile:has(.tile-title:text-is("${t}"))`); await page.waitForTimeout(700); };
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: 'scripts/shots/20-menu.png', fullPage: true });

// Dogs (easy: 3 images)
await openGame('Dog Breeds');
await page.click('.difficulty button:text-is("Easy")');
await page.waitForTimeout(600);
const dogImgs = await page.locator('.photo-stage img').count();
const dogImgVisible = await page.locator('.photo-stage img').first().evaluate((i) => i.naturalWidth > 0).catch(()=>false);
await page.fill('.guess-input input', 'lab');
await page.waitForTimeout(200);
await page.screenshot({ path: 'scripts/shots/21-dogs.png', fullPage: true });
await page.click('.guess-input button.primary'); // a guess (likely wrong) -> reveals more
await page.waitForTimeout(400);
const dogImgsAfter = await page.locator('.photo-stage img').count();

// Cats (medium: 2 images, hints)
await openGame('Cat Breeds');
await page.click('.difficulty button:text-is("Medium")');
await page.waitForTimeout(600);
await page.fill('.guess-input input', 'xx'); // no match
await page.waitForTimeout(150);
// force a wrong guess by typing a real but likely-wrong breed
await page.fill('.guess-input input', 'siamese');
await page.waitForTimeout(200);
await page.click('.guess-input button.primary');
await page.waitForTimeout(400);
const catHints = await page.locator('.img-hint').count();
await page.screenshot({ path: 'scripts/shots/22-cats.png', fullPage: true });

console.log('dog images shown (easy, want 3):', dogImgs, 'loaded:', dogImgVisible, 'after wrong guess:', dogImgsAfter);
console.log('cat hints after 1 wrong guess (medium):', catHints);
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
