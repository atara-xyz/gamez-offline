// Dry run: resolve every animal common name to an iNat taxon and print it, so we
// can eyeball mismatches before downloading hundreds of images.
import https from 'node:https';
import { ANIMALS } from './animals.mjs';

const UA = { headers: { 'User-Agent': 'geo-games-offline/1.0' } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJSON = (u) => new Promise((res, rej) =>
  https.get(u, UA, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej));

const ANIMAL_ICONIC = new Set(['Animalia', 'Mammalia', 'Aves', 'Reptilia', 'Amphibia', 'Actinopterygii', 'Mollusca', 'Arachnida', 'Insecta']);
const OVERRIDES = {
  Tiger: 'Panthera tigris', Cougar: 'Puma concolor', Gibbon: 'Hylobates lar',
  Wildebeest: 'Connochaetes taurinus', Gazelle: 'Eudorcas thomsonii',
  Hummingbird: 'Archilochus colubris', Kingfisher: 'Megaceryle alcyon',
  Rattlesnake: 'Crotalus atrox', Hornbill: 'Buceros rhinoceros', Bat: 'Eptesicus fuscus',
  Pangolin: 'Manis javanica', Mongoose: 'Herpestes ichneumon', Lobster: 'Homarus americanus',
  Grasshopper: 'Melanoplus differentialis', Dragonfly: 'Anax junius',
  Tarantula: 'Aphonopelma hentzi',
};
function pickAnimal(results, common) {
  const animals = (results || []).filter((r) => ANIMAL_ICONIC.has(r.iconic_taxon_name));
  const q = common.toLowerCase();
  return animals.find((r) => (r.preferred_common_name || '').toLowerCase() === q) || animals[0];
}

let issues = 0;
const seen = new Set();
for (const common of ANIMALS) {
  const query = OVERRIDES[common] || common;
  try {
    const tx = await getJSON(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(query)}&rank=species&per_page=10`);
    const t = OVERRIDES[common]
      ? (tx.results || []).filter((r) => ANIMAL_ICONIC.has(r.iconic_taxon_name))[0]
      : pickAnimal(tx.results, common);
    if (!t) { console.log(`❌ ${common.padEnd(22)} NO MATCH`); issues++; continue; }
    const dup = seen.has(t.name) ? ' ⚠DUP' : '';
    seen.add(t.name);
    const cn = (t.preferred_common_name || '?');
    const flag = cn.toLowerCase() !== common.toLowerCase() && !OVERRIDES[common] ? ' ←check' : '';
    console.log(`${flag || dup ? '⚠' : '✓'} ${common.padEnd(22)} ${t.name} (${cn}) [${t.iconic_taxon_name}]${flag}${dup}`);
    if (flag || dup) issues++;
  } catch (e) { console.log(`❌ ${common} ERR ${e.message}`); issues++; }
  await sleep(300);
}
console.log(`\n${ANIMALS.length} animals, ${issues} to review.`);
