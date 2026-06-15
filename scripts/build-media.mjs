// Downloads dog-breed, cat-breed, and animal images at BUILD time, resizes them
// to small WebP, and writes a manifest. Runtime stays fully offline.
//
// Run: npm run media   (slow, needs internet; only re-run to refresh image sets)
// Sources (all keyless): dog.ceo, TheCatAPI, iNaturalist. Images are CC/animal
// photos used here for an offline educational game.
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import sharp from 'sharp';
import pLimit from 'p-limit';
import { ANIMALS } from './animals.mjs';
import { BIRDS, BIRD_OVERRIDES } from './birds.mjs';
import { FLOWERS, FLOWER_OVERRIDES } from './flowers.mjs';
import { dogFacts } from './dog-facts.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const MEDIA = resolve(root, 'public/media');
const DATA = resolve(root, 'src/data');
const PER = Number(process.env.PER || 6); // images per item
const SIZE = 460; // max dimension px

const UA = { headers: { 'User-Agent': 'geo-games-offline/1.0 (educational)' } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getJSONraw(url) {
  return new Promise((res, rej) => {
    https.get(url, UA, (r) => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location)
        return getJSONraw(r.headers.location).then(res, rej);
      let d = '';
      r.on('data', (c) => (d += c));
      r.on('end', () => {
        if (r.statusCode === 429 || r.statusCode >= 500) return rej(new Error('http ' + r.statusCode));
        try { res(JSON.parse(d)); } catch { rej(new Error('bad json (rate limit?) ' + url)); }
      });
    }).on('error', rej);
  });
}
// Retry with backoff — iNaturalist rate-limits and returns XML error pages.
async function getJSON(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try { return await getJSONraw(url); }
    catch (e) { if (i === tries - 1) throw e; await sleep(1200 * (i + 1)); }
  }
}
function getBuffer(url) {
  return new Promise((res, rej) => {
    https.get(url, UA, (r) => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location)
        return getBuffer(r.headers.location).then(res, rej);
      if (r.statusCode !== 200) return rej(new Error('http ' + r.statusCode));
      const chunks = [];
      r.on('data', (c) => chunks.push(c));
      r.on('end', () => res(Buffer.concat(chunks)));
    }).on('error', rej);
  });
}

async function saveImage(url, outPath) {
  const buf = await getBuffer(url);
  await sharp(buf)
    .resize(SIZE, SIZE, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 72 })
    .toFile(outPath);
}

const limit = pLimit(6);
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Download up to PER images for an item; returns the saved web paths.
async function fetchItem(category, slug, urls) {
  const dir = resolve(MEDIA, category, slug);
  mkdirSync(dir, { recursive: true });
  const paths = [];
  let i = 0;
  for (const url of urls) {
    if (paths.length >= PER) break;
    const out = resolve(dir, `${i}.webp`);
    try {
      await saveImage(url, out);
      paths.push(`media/${category}/${slug}/${i}.webp`);
      i++;
    } catch { /* skip bad image */ }
  }
  return paths;
}

// ---------------- Dogs (dog.ceo) ----------------
async function buildDogs() {
  const all = await getJSON('https://dog.ceo/api/breeds/list/all');
  const breeds = Object.entries(all.message); // [name, [subbreeds]]
  const items = [];
  await Promise.all(
    breeds.map(([breed, subs]) =>
      limit(async () => {
        // Use sub-breeds as their own entries when present (deeper set).
        const variants = subs.length ? subs.map((s) => [`${s} ${breed}`, `${breed}/${s}`]) : [[breed, breed]];
        for (const [display, apiPath] of variants) {
          try {
            const imgs = await getJSON(`https://dog.ceo/api/breed/${apiPath}/images`);
            const urls = shuffle(imgs.message).slice(0, PER * 2);
            const name = titleCase(display);
            const slug = slugify(display);
            const paths = await fetchItem('dogs', slug, urls);
            if (paths.length >= 2) {
              const { facts, hintOrder } = dogFacts(name);
              items.push({ slug, name, images: paths, ...(hintOrder.length ? { facts, hintOrder } : {}) });
              process.stdout.write(`  🐕 ${name} (${paths.length})\n`);
            }
          } catch { /* skip */ }
        }
      }),
    ),
  );
  return { label: 'Dog Breeds', emoji: '🐕', items: items.sort(byName) };
}

// ---------------- Cats (TheCatAPI) ----------------
async function buildCats() {
  const breeds = await getJSON('https://api.thecatapi.com/v1/breeds');
  const items = [];
  await Promise.all(
    breeds.map((b) =>
      limit(async () => {
        try {
          const imgs = await getJSON(
            `https://api.thecatapi.com/v1/images/search?breed_ids=${b.id}&limit=10`,
          );
          const urls = imgs.map((x) => x.url).filter(Boolean);
          if (b.image?.url) urls.unshift(b.image.url);
          const slug = slugify(b.name);
          const paths = await fetchItem('cats', slug, dedupe(urls));
          if (paths.length >= 1) {
            items.push({
              slug, name: b.name, images: paths,
              facts: { Origin: b.origin, Temperament: b.temperament, Life: b.life_span ? `${b.life_span} yrs` : undefined },
              hintOrder: ['Origin', 'Temperament'],
            });
            process.stdout.write(`  🐈 ${b.name} (${paths.length})\n`);
          }
        } catch { /* skip */ }
      }),
    ),
  );
  return { label: 'Cat Breeds', emoji: '🐈', items: items.sort(byName) };
}

// iNat iconic groups that are actually animals (excludes Plantae/Fungi/etc).
const ANIMAL_ICONIC = new Set([
  'Animalia', 'Mammalia', 'Aves', 'Reptilia', 'Amphibia',
  'Actinopterygii', 'Mollusca', 'Arachnida', 'Insecta',
]);
// Common names that resolve ambiguously — pin them to a scientific name.
const OVERRIDES = {
  Tiger: 'Panthera tigris',
  Lynx: 'Eurasian Lynx',
  Badger: 'Meles meles',
  Tapir: 'Tapirus terrestris',
  Cougar: 'Puma concolor',
  Gibbon: 'Hylobates lar',
  Wildebeest: 'Connochaetes taurinus',
  Gazelle: 'Eudorcas thomsonii',
  Hummingbird: 'Archilochus colubris',
  Kingfisher: 'Megaceryle alcyon',
  Rattlesnake: 'Crotalus atrox',
  Hornbill: 'Buceros rhinoceros',
  Bat: 'Eptesicus fuscus',
  Pangolin: 'Manis javanica',
  Mongoose: 'Herpestes ichneumon',
  Lobster: 'Homarus americanus',
  Grasshopper: 'Melanoplus differentialis',
  Dragonfly: 'Anax junius',
  Tarantula: 'Aphonopelma hentzi',
};

// Pick the best taxon for a common name: exact common-name match wins, otherwise
// the first result in the allowed iconic groups (iNat relevance order).
function pickSpecies(results, common, iconic) {
  const ok = (results || []).filter((r) => iconic.has(r.iconic_taxon_name));
  const q = common.toLowerCase();
  return ok.find((r) => (r.preferred_common_name || '').toLowerCase() === q) || ok[0];
}

// ---------------- Generic species set (iNaturalist): Animals, Birds ----------------
async function buildSpecies(list, cfg) {
  const { key, label, emoji, iconic, overrides } = cfg;
  const rank = cfg.rank === undefined ? 'species' : cfg.rank; // '' = any rank (flowers → genus ok)
  const hintOrder = cfg.hintOrder || (key === 'birds' ? ['Order', 'Family', 'Class'] : ['Class', 'Order', 'Family']);
  const items = [];
  for (const common of list) {
    try {
      const query = overrides[common] || common;
      const tx = await getJSON(
        `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(query)}&${rank ? `rank=${rank}&` : ''}per_page=10`,
      );
      // For overrides, match the EXACT scientific name (iNat may rank a different
      // species first even for a scientific-name query, e.g. "Lynx lynx" → bobcat).
      const t = overrides[common]
        ? (tx.results || []).find((r) => r.name === overrides[common]) ||
          (tx.results || []).filter((r) => iconic.has(r.iconic_taxon_name))[0]
        : pickSpecies(tx.results, common, iconic);
      if (!t) { console.log(`  ⚠ no ${key} match for ${common}`); await sleep(500); continue; }
      const detail = await getJSON(`https://api.inaturalist.org/v1/taxa/${t.id}`);
      const td = detail.results?.[0] ?? t;
      const anc = (td.ancestors || []).reduce((o, a) => ((o[a.rank] = a.name), o), {});
      const obs = await getJSON(
        `https://api.inaturalist.org/v1/observations?taxon_id=${t.id}&photos=true&quality_grade=research&per_page=12&order_by=votes`,
      );
      const urls = [];
      for (const o of obs.results || [])
        for (const ph of o.photos || [])
          if (ph.url) urls.push(ph.url.replace('/square.', '/medium.'));
      if (td.default_photo?.medium_url) urls.unshift(td.default_photo.medium_url);
      const slug = slugify(common);
      const paths = await fetchItem(key, slug, dedupe(urls));
      if (paths.length >= 2) {
        items.push({
          slug, name: common, images: paths,
          facts: { Class: anc.class, Order: anc.order, Family: anc.family, Scientific: td.name },
          hintOrder,
        });
        process.stdout.write(`  ${emoji} ${common} (${paths.length}) [${anc.family || anc.order || '?'}]\n`);
      }
      await sleep(500); // be polite to iNaturalist
    } catch { await sleep(500); }
  }
  return { label, emoji, items: items.sort(byName), hard: true };
}

const buildAnimals = () =>
  buildSpecies(ANIMALS, { key: 'animals', label: 'Animals', emoji: '🦁', iconic: ANIMAL_ICONIC, overrides: OVERRIDES });
const buildBirds = () =>
  buildSpecies(BIRDS, { key: 'birds', label: 'Birds', emoji: '🦜', iconic: new Set(['Aves']), overrides: BIRD_OVERRIDES });
const buildFlowers = () =>
  buildSpecies(FLOWERS, {
    key: 'flowers', label: 'Flowers', emoji: '🌸', iconic: new Set(['Plantae']),
    overrides: FLOWER_OVERRIDES, rank: '', hintOrder: ['Family', 'Order', 'Class'],
  });

// helpers
const byName = (a, b) => a.name.localeCompare(b.name);
const titleCase = (s) => s.replace(/\b\w/g, (m) => m.toUpperCase());
const dedupe = (a) => [...new Set(a)];
function shuffle(a) { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = (i * 2654435761) % (i + 1); [r[i], r[j]] = [r[j], r[i]]; } return r; }

// ---------------- main ----------------
const only = process.argv[2]; // optional: dogs|cats|animals
mkdirSync(MEDIA, { recursive: true });
mkdirSync(DATA, { recursive: true });

const manifestPath = resolve(DATA, 'quizsets.json');
const manifest = existsSync(manifestPath) ? JSON.parse(await import('node:fs').then((m) => m.readFileSync(manifestPath, 'utf8'))) : {};

const tasks = { dogs: buildDogs, cats: buildCats, animals: buildAnimals, birds: buildBirds, flowers: buildFlowers };
for (const [key, fn] of Object.entries(tasks)) {
  if (only && only !== key) continue;
  console.log(`\n== Building ${key} ==`);
  if (existsSync(resolve(MEDIA, key))) rmSync(resolve(MEDIA, key), { recursive: true, force: true });
  const set = await fn();
  manifest[key] = set;
  writeFileSync(manifestPath, JSON.stringify(manifest)); // write incrementally
  console.log(`   ${key}: ${set.items.length} items`);
}
console.log('\nDone. Manifest:', manifestPath);
