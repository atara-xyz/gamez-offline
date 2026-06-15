// Renders polished PNG app icons (incl. iOS apple-touch-icon) from a master SVG.
// Run: npm run icons
import sharp from 'sharp';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = resolve(root, 'public');

// Master icon — a glowing cyber globe with grid, meridians, landmasses and a
// faint glow ring, plus a small location pin. No SVG filters (so the resvg
// rasterizer renders crisply); the "glow" is stacked translucent strokes.
const SIZE = 512;
const C = SIZE / 2;

function graticule() {
  const out = [];
  for (const ry of [54, 108])
    out.push(`<ellipse cx="${C}" cy="${C}" rx="150" ry="${ry}" fill="none" stroke="#0b3a66" stroke-width="6"/>`);
  out.push(`<line x1="${C - 150}" y1="${C}" x2="${C + 150}" y2="${C}" stroke="#0b3a66" stroke-width="6"/>`);
  for (const rx of [56, 112])
    out.push(`<ellipse cx="${C}" cy="${C}" rx="${rx}" ry="150" fill="none" stroke="#0b3a66" stroke-width="6"/>`);
  out.push(`<line x1="${C}" y1="${C - 150}" x2="${C}" y2="${C + 150}" stroke="#0b3a66" stroke-width="6"/>`);
  return out.join('');
}

const grid =
  Array.from({ length: 7 }, (_, i) => `<line x1="${(i + 1) * 64}" y1="0" x2="${(i + 1) * 64}" y2="${SIZE}"/>`).join('') +
  Array.from({ length: 7 }, (_, i) => `<line x1="0" y1="${(i + 1) * 64}" x2="${SIZE}" y2="${(i + 1) * 64}"/>`).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0d1b34"/>
      <stop offset="55%" stop-color="#091228"/>
      <stop offset="100%" stop-color="#050a14"/>
    </linearGradient>
    <radialGradient id="globe" cx="40%" cy="34%" r="78%">
      <stop offset="0%" stop-color="#5fe0ff"/>
      <stop offset="48%" stop-color="#1f9fe0"/>
      <stop offset="100%" stop-color="#0a3a66"/>
    </radialGradient>
    <radialGradient id="sheen" cx="38%" cy="30%" r="42%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${SIZE}" height="${SIZE}" fill="#070d1c"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>

  <g stroke="#13315a" stroke-width="2" opacity="0.5">${grid}</g>

  <circle cx="${C}" cy="${C}" r="176" fill="none" stroke="#22d3ee" stroke-width="2" opacity="0.16"/>
  <circle cx="${C}" cy="${C}" r="166" fill="none" stroke="#22d3ee" stroke-width="3" opacity="0.22"/>
  <circle cx="${C}" cy="${C}" r="158" fill="none" stroke="#22d3ee" stroke-width="6" opacity="0.30"/>

  <circle cx="${C}" cy="${C}" r="150" fill="url(#globe)"/>
  <clipPath id="ball"><circle cx="${C}" cy="${C}" r="150"/></clipPath>
  <g clip-path="url(#ball)">
    ${graticule()}
    <g fill="#7ff09a" opacity="0.95">
      <path d="M196 188 C 230 172, 286 180, 292 206 C 298 232, 252 242, 264 268 C 276 294, 226 306, 210 282 C 194 258, 170 246, 178 220 C 184 200, 182 196, 196 188 Z"/>
      <path d="M318 168 C 352 174, 372 206, 352 224 C 332 242, 348 262, 326 276 C 304 290, 286 268, 296 244 C 306 220, 300 196, 312 180 Z"/>
      <path d="M300 312 C 330 304, 356 322, 346 344 C 336 366, 306 360, 294 380 C 282 400, 262 386, 268 360 C 274 334, 286 318, 300 312 Z"/>
    </g>
    <ellipse cx="${C}" cy="${C}" rx="150" ry="150" fill="url(#sheen)"/>
  </g>

  <g transform="translate(374,150)">
    <path d="M0 -30 C 20 -30, 32 -16, 32 2 C 32 26, 0 52, 0 52 C 0 52, -32 26, -32 2 C -32 -16, -20 -30, 0 -30 Z" fill="#f72585"/>
    <circle cx="0" cy="2" r="11" fill="#0a1424"/>
  </g>
</svg>`;

const targets = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-512-maskable.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32.png', size: 32 },
];

writeFileSync(resolve(PUB, 'icon.svg'), svg);
for (const t of targets) {
  await sharp(Buffer.from(svg), { density: 384 })
    .resize(t.size, t.size)
    .png()
    .toFile(resolve(PUB, t.name));
  console.log('  ✓', t.name, `${t.size}x${t.size}`);
}
console.log('Icons written to public/.');
