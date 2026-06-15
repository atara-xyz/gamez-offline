import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--ignore-certificate-errors'] });
const p = await b.newPage({ ignoreHTTPSErrors: true, viewport: { width: 1000, height: 900 } });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.goto('https://localhost:4173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
const open = async (t) => { await p.click('text=🌐 Geo Games'); await p.click(`.game-tile:has(.tile-title:text-is("${t}"))`); await p.waitForTimeout(450); };
const out = {};

// Sketch It: draw on the canvas, submit, get a score
await p.click('.difficulty button:text-is("Easy")');
await open('Sketch It');
const prompt = await p.locator('.sk-prompt strong').textContent();
const cv = await p.locator('.sk-canvas').boundingBox();
// trace a rough circle in the canvas center (works decently for many prompts)
const cx = cv.x + cv.width / 2, cy = cv.y + cv.height / 2, r = cv.width * 0.28;
await p.mouse.move(cx + r, cy);
await p.mouse.down();
for (let a = 0; a <= 360; a += 12) { const rad = (a * Math.PI) / 180; await p.mouse.move(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r); }
await p.mouse.up();
await p.waitForTimeout(150);
await p.click('.sk-actions button.primary'); // Done
await p.waitForTimeout(300);
out.sketchPrompt = prompt;
out.sketchScored = await p.locator('.sketchit .result').textContent();
await p.screenshot({ path: 'scripts/shots/b0-sketch.png' });

// Retro v2: themed menu + each event launches a canvas + plays
await open('Retro Games');
out.retroThemes = await p.locator('.retro-theme .cat-title').allTextContents();
out.retroEventTiles = await p.locator('.retro-events .game-tile').count();
// Sprint
await p.click('.retro-events .game-tile:has-text("100m Sprint")');
await p.waitForTimeout(200);
await p.click('.retro-event button.primary');
for (let i = 0; i < 24; i++) { await p.keyboard.press(i % 2 ? 'ArrowLeft' : 'ArrowRight'); await p.waitForTimeout(35); }
out.sprintCanvas = await p.locator('.retro-canvas').count();
await p.screenshot({ path: 'scripts/shots/b1-retro-sprint.png' });
// Ski Slalom
await p.click('.retro-head button.ghost');
await p.click('.retro-events .game-tile:has-text("Ski Slalom")');
await p.waitForTimeout(200);
await p.click('.retro-event button.primary');
await p.keyboard.down('ArrowRight'); await p.waitForTimeout(400); await p.keyboard.up('ArrowRight');
await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(300); await p.keyboard.up('ArrowLeft');
await p.screenshot({ path: 'scripts/shots/b2-retro-slalom.png' });
out.slalomCanvas = await p.locator('.retro-canvas').count();
// Halfpipe
await p.click('.retro-head button.ghost');
await p.click('.retro-events .game-tile:has-text("Halfpipe")');
await p.waitForTimeout(200);
await p.click('.retro-event button.primary');
await p.waitForTimeout(1500);
await p.screenshot({ path: 'scripts/shots/b3-retro-halfpipe.png' });
out.halfpipeCanvas = await p.locator('.retro-canvas').count();

console.log(JSON.stringify(out, null, 1));
console.log('errors:', errors.length ? errors.slice(0, 8) : 'none');
await b.close();
