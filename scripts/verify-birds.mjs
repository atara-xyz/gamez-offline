import https from 'node:https';
import { BIRDS, BIRD_OVERRIDES } from './birds.mjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const g = (u) => new Promise((s, j) => https.get(u, { headers: { 'User-Agent': 'geo-games' } }, (x) => { let d = ''; x.on('data', (c) => (d += c)); x.on('end', () => { try { s(JSON.parse(d)); } catch (e) { j(e); } }); }).on('error', j));
async function gj(u, t = 4) { for (let i = 0; i < t; i++) { try { return await g(u); } catch (e) { if (i === t - 1) throw e; await sleep(1000 * (i + 1)); } } }
const pick = (rs, c) => { const a = (rs || []).filter((r) => r.iconic_taxon_name === 'Aves'); const q = c.toLowerCase(); return a.find((r) => (r.preferred_common_name || '').toLowerCase() === q) || a[0]; };
let issues = 0; const seen = new Set();
for (const c of BIRDS) {
  const q = BIRD_OVERRIDES[c] || c;
  try {
    const tx = await gj(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(q)}&rank=species&per_page=10`);
    const t = BIRD_OVERRIDES[c] ? (tx.results || []).find((r) => r.name === BIRD_OVERRIDES[c]) : pick(tx.results, c);
    if (!t) { console.log('NONE  ' + c); issues++; continue; }
    const cn = t.preferred_common_name || '?'; const dup = seen.has(t.name); seen.add(t.name);
    const flag = (cn.toLowerCase() !== c.toLowerCase() && !BIRD_OVERRIDES[c]) || dup;
    if (flag) { console.log((dup ? 'DUP   ' : 'CHK   ') + c + '  ->  ' + t.name + ' (' + cn + ')' + (dup ? '  !!' : '')); issues++; }
  } catch { console.log('ERR   ' + c); issues++; }
  await sleep(280);
}
console.log(`\n${BIRDS.length} birds, ${issues} flagged for review`);
