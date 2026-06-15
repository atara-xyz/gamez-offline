import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--ignore-certificate-errors'] });
const p = await b.newPage({ ignoreHTTPSErrors: true, viewport: { width: 1100, height: 950 } });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.goto('https://localhost:4173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
const open = async (t) => { await p.click('text=🌐 Geo Games'); await p.click(`.game-tile:has(.tile-title:text-is("${t}"))`); await p.waitForTimeout(450); };
const out = {};

// Brand Logos
await open('Brand Logos');
out.brandLogoPath = await p.locator('.brand-plate path').count();
await p.fill('.guess-input input', 'Nike'); await p.waitForTimeout(150); await p.click('.guess-input button.primary'); await p.waitForTimeout(250);
out.brandGuessRows = await p.locator('.guess-row').count();
await p.screenshot({ path: 'scripts/shots/a0-brands.png' });

// Flowers
await open('Flowers');
out.flowerImg = await p.locator('.photo-stage img').first().evaluate((i) => i.complete && i.naturalWidth > 0).catch(() => false);

// Travle map gating
await p.click('text=🌐 Geo Games'); await p.click('.difficulty button:text-is("Easy")');
await open('Travle');
out.travleMapEasy = await p.locator('.travle-map').count();
await p.screenshot({ path: 'scripts/shots/a1-travle-map.png' });
await p.click('text=🌐 Geo Games'); await p.click('.difficulty button:text-is("Hard")');
await open('Travle');
out.travleMapHard = await p.locator('.travle-map').count();
await p.click('.difficulty button:text-is("Easy")');

// Geo Dash: reach wave + ball via competent bot
await open('Geo Dash');
await p.click('.dash-overlay button.primary');
const modes = await p.evaluate(() => new Promise((resolve) => {
  const seen = new Set(); let held = false, maxD = 0;
  const press = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
  const rel = () => window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' }));
  const iv = setInterval(() => {
    const s = window.__dash; if (!s) return;
    if (s.phase === 'dead') { clearInterval(iv); resolve({ seen: [...seen], maxD }); return; }
    seen.add(s.mode); maxD = Math.max(maxD, s.d);
    const near = s.items.filter((o) => o.k === 'block' && o.x > s.PX - 40 && o.x < s.PX + 190);
    if (s.mode === 'ship' || s.mode === 'wave') {
      const ceil = near.filter((o) => o.ceil).sort((a, c) => a.x - c.x)[0];
      const floor = near.filter((o) => !o.ceil).sort((a, c) => a.x - c.x)[0];
      let center = s.GY / 2; if (ceil && floor) center = (ceil.h + (s.GY - floor.h)) / 2;
      const py = s.py + s.PS / 2;
      if (py > center + 2) { if (!held) { press(); held = true; } } else if (held) { rel(); held = false; }
    } else if (s.mode === 'ball') {
      // flip toward center-ish: tap occasionally
      const py = s.py + s.PS / 2;
      const spikeFloor = s.items.some((o) => o.k === 'spike' && !o.ceil && o.x > s.PX && o.x < s.PX + 90);
      if (spikeFloor && py > s.GY / 2) { press(); setTimeout(rel, 30); }
    } else {
      if (held) { rel(); held = false; }
      const deadly = s.items.filter((o) => (o.k === 'spike' || (o.k === 'block' && !o.ceil)) && o.x > s.PX && o.x < s.PX + 92);
      if (s.grounded && deadly.length) { press(); setTimeout(rel, 55); }
    }
  }, 16);
  setTimeout(() => { clearInterval(iv); resolve({ seen: [...seen], maxD, timeout: true }); }, 35000);
}));
out.geoDashModes = modes;

// Dress to Impress
await open('Dress to Impress');
await p.click('.du-pieces .du-piece >> nth=0');
await p.click('.du-tab:has-text("Top")'); await p.click('.du-pieces .du-piece >> nth=0');
await p.click('.du-tab:has-text("Bottom")'); await p.click('.du-pieces .du-piece >> nth=0');
await p.waitForTimeout(150);
await p.locator('.dressup > button.primary').click().catch(() => {});
await p.waitForTimeout(300);
out.dressScored = await p.locator('.dressup .result').count();
await p.screenshot({ path: 'scripts/shots/a2-dressup.png' });

// Retro Games: sprint
await open('Retro Games');
await p.click('.retro-events .game-tile >> nth=0');
await p.waitForTimeout(200);
await p.click('.retro-event button.primary');
for (let i = 0; i < 30; i++) { await p.keyboard.press(i % 2 ? 'ArrowLeft' : 'ArrowRight'); await p.waitForTimeout(35); }
const sprintDist = await p.locator('.retro-hud span').first().textContent();
out.sprintMoved = parseFloat(sprintDist || '0') > 0;
await p.screenshot({ path: 'scripts/shots/a3-retro.png' });

console.log(JSON.stringify(out, null, 1));
console.log('errors:', errors.length ? errors.slice(0, 8) : 'none');
await b.close();
