// Bakes the Brand Logos dataset from `simple-icons` (offline SVG paths + brand
// colors). Curated to well-known brands grouped by category for hint support.
// Run: npm run brands  → src/data/brands.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const si = require('simple-icons');
const DATA = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data');
mkdirSync(DATA, { recursive: true });

// category → [simple-icons slugs]
const CATEGORIES = {
  Tech: ['apple', 'google', 'samsung', 'intel', 'nvidia', 'dell', 'hp', 'sony', 'lg', 'huawei', 'xiaomi', 'cisco', 'qualcomm', 'amd', 'dropbox'],
  Internet: ['youtube', 'instagram', 'facebook', 'x', 'tiktok', 'whatsapp', 'snapchat', 'reddit', 'pinterest', 'spotify', 'netflix', 'twitch', 'discord', 'telegram', 'ebay', 'paypal', 'wikipedia', 'github', 'roblox', 'airbnb', 'uber', 'visa', 'mastercard'],
  Cars: ['toyota', 'honda', 'ford', 'volkswagen', 'bmw', 'audi', 'tesla', 'ferrari', 'lamborghini', 'porsche', 'nissan', 'hyundai', 'kia', 'jeep', 'volvo', 'mazda', 'subaru', 'chevrolet', 'renault', 'peugeot', 'fiat'],
  'Food & Drink': ['mcdonalds', 'burgerking', 'kfc', 'starbucks', 'cocacola', 'redbull'],
  'Sport & Style': ['nike', 'adidas', 'puma', 'underarmour', 'reebok', 'newbalance', 'playstation'],
  Airlines: ['emirates', 'qatarairways', 'lufthansa', 'ryanair', 'easyjet', 'klm', 'turkishairlines', 'airfrance', 'britishairways', 'americanairlines'],
};

const titleOverride = { x: 'X (Twitter)', cocacola: 'Coca-Cola', mcdonalds: "McDonald's", burgerking: 'Burger King', kfc: 'KFC', hp: 'HP', ibm: 'IBM', lg: 'LG', bmw: 'BMW', kia: 'Kia', klm: 'KLM', louisvuitton: 'Louis Vuitton', newbalance: 'New Balance', pizzahut: 'Pizza Hut', underarmour: 'Under Armour', qatarairways: 'Qatar Airways', turkishairlines: 'Turkish Airlines', playstation: 'PlayStation' };

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const out = [];
const missing = [];
for (const [cat, slugs] of Object.entries(CATEGORIES)) {
  for (const slug of slugs) {
    const key = 'si' + slug.split('-').map(cap).join('');
    const icon = si[key] || si['si' + cap(slug)];
    if (!icon) { missing.push(slug); continue; }
    out.push({
      slug,
      name: titleOverride[slug] || icon.title,
      cat,
      hex: '#' + icon.hex,
      path: icon.path,
    });
  }
}
out.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(resolve(DATA, 'brands.json'), JSON.stringify(out));
console.log(`brands.json — ${out.length} brands across ${Object.keys(CATEGORIES).length} categories.`);
if (missing.length) console.log('  ⚠ not found in simple-icons:', missing.join(', '));
