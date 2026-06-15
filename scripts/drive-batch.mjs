import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--ignore-certificate-errors'] });
const p = await b.newPage({ ignoreHTTPSErrors: true, viewport: { width: 1100, height: 900 } });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.goto('https://localhost:4173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
const open = async (t) => { await p.click('text=🌐 Geo Games'); await p.click(`.game-tile:has(.tile-title:text-is("${t}"))`); await p.waitForTimeout(450); };
const log = {};

// Geo Dash v2: ship mode reached + coins
await open('Geo Dash');
await p.click('.dash-overlay button.primary');
let sawShip = false, maxCoins = 0;
for (let i = 0; i < 80; i++) { await p.keyboard.down('Space'); await p.waitForTimeout(70); await p.keyboard.up('Space'); await p.waitForTimeout(40);
  const d = await p.evaluate(() => window.__dash); if (d?.mode === 'ship') sawShip = true; if (d?.coins > maxCoins) maxCoins = d.coins; }
log.geodash = { sawShip, maxCoins };

// Higher or Lower
await open('Higher or Lower');
await p.click('.hl-buttons button >> nth=0');
await p.waitForTimeout(300);
log.higherlower = { revealedOrAdvanced: await p.locator('.hl-card .hl-val').count() };

// Countryle
await open('Countryle');
await p.fill('.guess-input input', 'France'); await p.waitForTimeout(150); await p.click('.guess-input button.primary'); await p.waitForTimeout(300);
log.countryle = { chips: await p.locator('.ctyle-row .chip').count() };

// Travle
await open('Travle');
const goal = await p.locator('.travle-goal').textContent();
log.travle = { hasGoal: !!goal, chainStart: await p.locator('.t-node').count() };

// Odd One Out
await open('Odd One Out');
await p.keyboard.press('1'); await p.waitForTimeout(300);
log.oddoneout = { revealed: await p.locator('.round-end .hint').count(), choices: await p.locator('.odd-choices .choice').count() };

// Hangman
await open('Hangman');
await p.keyboard.press('a'); await p.keyboard.press('e'); await p.keyboard.press('z'); await p.waitForTimeout(200);
log.hangman = { slots: await p.locator('.hm-slot').count(), lives: await p.locator('.hm-lives .heart').count() };

// Math Drill
await open('Math Drill');
await p.click('.md-card button.primary'); await p.waitForTimeout(300);
const prob = await p.locator('.md-problem').textContent();
log.mathdrill = { problemShown: /[0-9].*=/.test(prob || ''), prob: (prob||'').trim() };
await p.screenshot({ path: 'scripts/shots/93-batch.png', fullPage: true });

console.log(JSON.stringify(log, null, 1));
console.log('errors:', errors.length ? errors.slice(0, 6) : 'none');
await b.close();
