// Pre-computes ALL game data into static JSON so the app runs fully offline.
// Run: npm run data   (or it runs automatically as part of `npm run build`).
//
// Outputs into src/data/:
//   countries.json   - facts: codes, name, capital, lat/lng, region, borders, flag, area, population, tier
//   cities.json      - top cities per country (name, lat, lng, pop)
//   silhouettes.json - per-country normalized SVG path (Worldle "guess the shape")
//   worldmap.json    - all countries in one shared projection (Globle-style map coloring)

import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import * as topojson from 'topojson-client';
import { geoEquirectangular, geoMercator, geoPath } from 'd3-geo';

const require = createRequire(import.meta.url);
const countriesRaw = require('world-countries');
const allCities = require('all-the-cities');

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'src/data');
mkdirSync(outDir, { recursive: true });

const populations = JSON.parse(readFileSync(resolve(__dirname, 'populations.json'), 'utf8'));

// world-atlas topojson (numeric ccn3 ids). 50m = detailed shapes for silhouettes.
const atlasPath = (f) => resolve(root, 'node_modules/world-atlas', f);
const topo50 = JSON.parse(readFileSync(atlasPath('countries-50m.json'), 'utf8'));
const topo110 = JSON.parse(readFileSync(atlasPath('countries-110m.json'), 'utf8'));
const feat50 = topojson.feature(topo50, topo50.objects.countries).features;
const feat110 = topojson.feature(topo110, topo110.objects.countries).features;

// Some numeric ids are shared by a country and one of its minor territories
// (e.g. 036 = Australia AND "Ashmore and Cartier Is."). Keep the bigger geometry
// so we always get the real country, not a tiny island.
function coordCount(f) {
  const g = f.geometry;
  if (!g) return 0;
  const polys = g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates];
  return polys.reduce((n, poly) => n + poly.reduce((m, ring) => m + ring.length, 0), 0);
}
function biggestById(features) {
  const map = new Map();
  for (const f of features) {
    const key = String(f.id).padStart(3, '0');
    const cur = map.get(key);
    if (!cur || coordCount(f) > coordCount(cur)) map.set(key, f);
  }
  return map;
}
const byNum50 = biggestById(feat50);
const byNum110 = biggestById(feat110);

// ---- Difficulty: "easy" = countries a kid is likely to have heard of. -------
const EASY = new Set([
  'USA','CAN','MEX','BRA','ARG','CHL','PER','COL','VEN', // Americas
  'GBR','IRL','FRA','ESP','PRT','DEU','ITA','NLD','BEL','CHE','AUT','SWE','NOR',
  'DNK','FIN','POL','GRC','RUS','UKR','TUR', // Europe
  'CHN','JPN','KOR','IND','IDN','THA','VNM','PHL','MYS','SGP','PAK','SAU','IRN','IRQ','ISR','ARE', // Asia
  'EGY','ZAF','NGA','KEN','ETH','MAR','GHA','TZA', // Africa
  'AUS','NZL', // Oceania
]);

function tierFor(cca3, population) {
  if (EASY.has(cca3)) return 1;          // easy
  if ((population ?? 0) >= 3_000_000) return 2; // medium
  return 3;                               // hard
}

// ---- Build the country list -------------------------------------------------
const countries = [];
const cca2to3 = new Map();
const cca3toNum = new Map(); // cca3 -> ccn3 for geometry lookup
for (const c of countriesRaw) {
  if (!c.latlng || c.latlng.length !== 2) continue;
  if (!byNum50.has(c.ccn3) && !byNum110.has(c.ccn3)) continue; // need geometry
  const population = populations[c.cca3] ?? 0;
  cca2to3.set(c.cca2, c.cca3);
  cca3toNum.set(c.cca3, c.ccn3);
  countries.push({
    id: c.cca3,
    cca2: c.cca2,
    name: c.name.common,
    official: c.name.official,
    capital: c.capital?.[0] ?? null,
    lat: c.latlng[0],
    lng: c.latlng[1],
    region: c.region || 'Other',
    subregion: c.subregion || '',
    borders: c.borders || [],
    flag: c.flag || '',
    area: c.area ?? null,
    population,
    landlocked: !!c.landlocked,
    tier: tierFor(c.cca3, population),
  });
}
countries.sort((a, b) => a.name.localeCompare(b.name));

// ---- Silhouettes: fit each country to a 100x100 box (Worldle shape view) ----
// We store the path AND the mercator projection params (scale + translate) so
// the Cities deep-dive can plot city lat/lng aligned inside the same shape.
const silhouettes = {};
for (const c of countries) {
  const ccn3 = cca3toNum.get(c.id);
  const f = byNum50.get(ccn3) || byNum110.get(ccn3);
  if (!f) continue;
  const projection = geoMercator();
  try {
    projection.fitExtent([[6, 6], [94, 94]], f);
  } catch {
    continue;
  }
  const path = geoPath(projection);
  const d = path(f);
  if (d) {
    silhouettes[c.id] = {
      d,
      k: projection.scale(),
      t: projection.translate(),
    };
  }
}

// ---- World map: all countries in ONE equirectangular projection -------------
const W = 800, H = 400;
const worldProj = geoEquirectangular().fitSize([W, H], { type: 'Sphere' });
const worldPath = geoPath(worldProj);
const worldPaths = {};
for (const c of countries) {
  const ccn3 = cca3toNum.get(c.id);
  const f = byNum110.get(ccn3) || byNum50.get(ccn3);
  if (!f) continue;
  const d = worldPath(f);
  if (d) worldPaths[c.id] = d;
}

// ---- Cities: top 12 per country from all-the-cities -------------------------
const cityBuckets = new Map();
for (const city of allCities) {
  const cca3 = cca2to3.get(city.country);
  if (!cca3) continue;
  if (!cityBuckets.has(cca3)) cityBuckets.set(cca3, []);
  cityBuckets.get(cca3).push({
    name: city.name,
    lat: city.loc.coordinates[1],
    lng: city.loc.coordinates[0],
    pop: city.population,
  });
}
const cities = {};
for (const [cca3, list] of cityBuckets) {
  list.sort((a, b) => b.pop - a.pop);
  // de-dupe by name, keep largest
  const seen = new Set();
  const top = [];
  for (const c of list) {
    if (seen.has(c.name)) continue;
    seen.add(c.name);
    top.push(c);
    if (top.length >= 12) break;
  }
  cities[cca3] = top;
}

// ---- Write ------------------------------------------------------------------
const write = (name, obj) => {
  const p = resolve(outDir, name);
  writeFileSync(p, JSON.stringify(obj));
  const kb = (Buffer.byteLength(JSON.stringify(obj)) / 1024).toFixed(0);
  console.log(`  ${name.padEnd(18)} ${kb} KB`);
};

// ---- City shapes: a country outline framed on where its cities actually are.
// Full-country silhouettes break for nations with far-flung territories or that
// cross the antimeridian (Russia's far east, US Alaska, France's overseas, …) —
// the mainland shrinks to a dot or smears across the map. For the Cities
// deep-dive we keep only the polygons near the cities and fit to those.
function ringBBox(ring) {
  let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
  for (const [lng, lat] of ring) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return { minLng, maxLng, minLat, maxLat };
}
const overlaps = (a, b) =>
  !(a.maxLng < b.minLng || a.minLng > b.maxLng || a.maxLat < b.minLat || a.minLat > b.maxLat);

function cityShape(feature, cityList) {
  // Fit the projection to the CITIES themselves (a MultiPoint — no polygon-winding
  // pitfalls), mapping them into [16,84] so there's margin. Mercator is monotonic
  // in lng/lat, so every city is guaranteed on-screen regardless of geometry. This
  // is robust to missing atolls, excluded mainlands, and antimeridian crossings.
  let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
  for (const c of cityList) {
    minLng = Math.min(minLng, c.lng); maxLng = Math.max(maxLng, c.lng);
    minLat = Math.min(minLat, c.lat); maxLat = Math.max(maxLat, c.lat);
  }
  const fitGeo = { type: 'MultiPoint', coordinates: cityList.map((c) => [c.lng, c.lat]) };
  const projection = geoMercator();
  projection.fitExtent([[16, 16], [84, 84]], fitGeo);

  // Draw only the polygons near the cities so far territories don't smear.
  const padLng = (maxLng - minLng) * 0.4 + 1.5;
  const padLat = (maxLat - minLat) * 0.4 + 1.5;
  const cbox = { minLng: minLng - padLng, maxLng: maxLng + padLng, minLat: minLat - padLat, maxLat: maxLat + padLat };
  const geom = feature.geometry;
  const polys = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
  const kept = polys.filter((poly) => overlaps(ringBBox(poly[0]), cbox));
  const drawGeom = { type: 'MultiPolygon', coordinates: kept.length ? kept : polys };
  const d = geoPath(projection)(drawGeom);
  return { d, k: projection.scale(), t: projection.translate() };
}

const cityShapes = {};
for (const c of countries) {
  const list = cities[c.id];
  if (!list || list.length < 1) continue;
  const ccn3 = cca3toNum.get(c.id);
  const f = byNum50.get(ccn3) || byNum110.get(ccn3);
  if (!f) continue;
  try {
    cityShapes[c.id] = cityShape(f, list);
  } catch {
    /* skip un-projectable */
  }
}

// ---- Copy real flag SVGs (Windows/Chrome don't render flag emoji) ----------
const flagSrc = resolve(root, 'node_modules/flag-icons/flags/4x3');
const flagDest = resolve(root, 'public/flags');
cpSync(flagSrc, flagDest, { recursive: true });

console.log('Building geo data...');
write('countries.json', countries);
write('cities.json', cities);
write('silhouettes.json', silhouettes);
write('cityshapes.json', cityShapes);
write('worldmap.json', { width: W, height: H, paths: worldPaths });
console.log(
  `Done. ${countries.length} countries, ` +
    `${Object.keys(silhouettes).length} silhouettes, ` +
    `${Object.values(cities).reduce((n, a) => n + a.length, 0)} cities.`,
);
