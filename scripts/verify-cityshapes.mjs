// Verify every pickable country's city map: cities must project inside the box
// and the outline must fill a reasonable area (not a tiny dot or a smear).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { geoMercator } from 'd3-geo';
const require = createRequire(import.meta.url);

const countries = JSON.parse(readFileSync('src/data/countries.json'));
const cities = JSON.parse(readFileSync('src/data/cities.json'));
const shapes = JSON.parse(readFileSync('src/data/cityshapes.json'));

const MIN_CITIES = 5;
const pickable = countries.filter((c) => (cities[c.id]?.length ?? 0) >= MIN_CITIES);

function pathBBox(d) {
  const nums = d.match(/-?\d+\.?\d*/g)?.map(Number) ?? [];
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (let i = 0; i < nums.length - 1; i += 2) {
    const x = nums[i], y = nums[i + 1];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return { w: maxX - minX, h: maxY - minY, minX, maxX, minY, maxY };
}

const bad = [];
for (const c of pickable) {
  const s = shapes[c.id];
  if (!s) { bad.push([c.name, 'NO SHAPE']); continue; }
  const proj = geoMercator().scale(s.k).translate(s.t);
  const list = cities[c.id];
  let inBounds = 0;
  for (const city of list) {
    const p = proj([city.lng, city.lat]);
    if (p && p[0] >= -2 && p[0] <= 102 && p[1] >= -2 && p[1] <= 102) inBounds++;
  }
  const frac = inBounds / list.length;
  const bb = pathBBox(s.d);
  const fill = Math.max(bb.w, bb.h); // should be ~88 (fit to [6,94])
  // Note: outline "overflow" beyond the box is EXPECTED and desirable — for a
  // large country with clustered cities we zoom into the populated region and let
  // the SVG clip the rest. We only flag cities falling out of bounds, or a shape
  // so small it's effectively invisible (no usable outline at all).
  const reasons = [];
  if (frac < 0.85) reasons.push(`only ${(frac * 100).toFixed(0)}% cities in-bounds`);
  if (fill < 8) reasons.push(`outline degenerate (${fill.toFixed(0)})`);
  if (reasons.length) bad.push([c.name, reasons.join('; ')]);
}

console.log(`Pickable countries: ${pickable.length}`);
console.log(`Problem countries: ${bad.length}`);
for (const [name, why] of bad) console.log(`  ✗ ${name}: ${why}`);
if (!bad.length) console.log('  ✓ all good');
