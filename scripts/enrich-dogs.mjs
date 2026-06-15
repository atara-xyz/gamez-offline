// Adds Group/Origin facts (+ hintOrder) to the dog set in quizsets.json so the
// Dog Breeds game shows progressive hints — without re-downloading images.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dogFacts } from './dog-facts.mjs';

const p = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/quizsets.json');
const manifest = JSON.parse(readFileSync(p, 'utf8'));
let withGroup = 0, withOrigin = 0;
for (const item of manifest.dogs?.items ?? []) {
  const { facts, hintOrder } = dogFacts(item.name);
  if (hintOrder.length) {
    item.facts = facts;
    item.hintOrder = hintOrder;
    if (facts.Group) withGroup++;
    if (facts.Origin) withOrigin++;
  }
}
writeFileSync(p, JSON.stringify(manifest));
const n = manifest.dogs.items.length;
console.log(`Enriched ${n} dogs: ${withGroup} with Group, ${withOrigin} with Origin.`);
