import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--ignore-certificate-errors'] });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const url = 'https://localhost:4173/';
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

// --- Players: add + rename + persist ---
await page.click('.score-chip.add'); // 👥 Manage
await page.waitForTimeout(200);
await page.fill('.add-player input', 'Mara');
await page.click('.add-player button.primary');
await page.waitForTimeout(200);
const playerNames1 = await page.locator('.player-name').evaluateAll((els) => els.map((e) => e.value));
await page.click('.modal-foot button.primary'); // Done
// reload → persisted?
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(400);
const chips = await page.locator('.score-chip').allTextContents();
const persisted = chips.some((c) => c.includes('Mara'));

// --- Birdle tile + game ---
await page.click('.game-tile:has(.tile-title:text-is("Birdle"))');
await page.waitForTimeout(700);
const birdImg = await page.locator('.photo-stage img').first().evaluate((i) => i.complete && i.naturalWidth > 0).catch(() => false);

// --- Dog hints: wrong guess reveals a hint ---
await page.click('text=🌐 Geo Games');
await page.click('.difficulty button:text-is("Easy")');
await page.click('.game-tile:has(.tile-title:text-is("Dog Breeds"))');
await page.waitForTimeout(600);
await page.fill('.guess-input input', 'Beagle');
await page.waitForTimeout(150);
await page.click('.guess-input button.primary');
await page.waitForTimeout(300);
const dogHints = await page.locator('.img-hint').allTextContents();

// --- NBA tint + Enter-to-Next ---
await page.click('text=🌐 Geo Games');
await page.click('.game-tile:has(.tile-title:text-is("NBA Logos"))');
await page.waitForTimeout(500);
// exhaust 6 wrong-ish guesses to force reveal (guess same set of teams)
const teams = ['Lakers', 'Celtics', 'Heat', 'Bulls', 'Spurs', 'Nuggets'];
for (const t of teams) {
  await page.fill('.guess-input input', t);
  await page.waitForTimeout(120);
  await page.click('.guess-input button.primary');
  await page.waitForTimeout(150);
}
await page.waitForTimeout(300);
const tinted = await page.locator('.game.nba.tinted').count();
// Enter-to-Next: press Enter, expect a new round (round-end gone)
const hadRoundEnd = await page.locator('.round-end').count();
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
const afterEnterRoundEnd = await page.locator('.round-end').count();

// --- Wordle jokers ---
await page.click('text=🌐 Geo Games');
await page.click('.difficulty button:text-is("Medium")');
await page.click('.game-tile:has(.tile-title:text-is("Wordle"))');
await page.waitForTimeout(500);
const jokerBtns = await page.locator('.joker').count();
const revealDisabledEarly = await page.locator('.joker:has-text("Reveal a letter")').isDisabled().catch(() => null);
await page.screenshot({ path: 'scripts/shots/80-features.png', fullPage: true });

console.log('players after add:', playerNames1, '| persisted across reload:', persisted);
console.log('Birdle photo loaded:', birdImg);
console.log('dog hints after wrong guess:', dogHints);
console.log('NBA tinted on reveal:', tinted, '| roundEnd before Enter:', hadRoundEnd, '→ after Enter:', afterEnterRoundEnd);
console.log('Wordle joker buttons:', jokerBtns, '| reveal-letter disabled early (want true):', revealDisabledEarly);
console.log('errors:', errors.length ? errors.slice(0, 5) : 'none');
await browser.close();
