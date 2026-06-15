// Typed access to the pre-computed offline dataset (built by scripts/build-data.mjs).

import countriesJson from './data/countries.json';
import citiesJson from './data/cities.json';
import silhouettesJson from './data/silhouettes.json';
import cityshapesJson from './data/cityshapes.json';
import worldmapJson from './data/worldmap.json';
import quizsetsJson from './data/quizsets.json';
import wordsJson from './data/words.json';
import nbaJson from './data/nba.json';
import brandsJson from './data/brands.json';

export interface Country {
  id: string; // cca3, e.g. "DEU"
  cca2: string; // "DE"
  name: string;
  official: string;
  capital: string | null;
  lat: number;
  lng: number;
  region: string;
  subregion: string;
  borders: string[]; // cca3 codes
  flag: string; // emoji
  area: number | null;
  population: number;
  landlocked: boolean;
  tier: 1 | 2 | 3; // 1 easy, 2 medium, 3 hard
}

export interface City {
  name: string;
  lat: number;
  lng: number;
  pop: number;
}

export interface Shape {
  d: string; // SVG path in a 100x100 box
  k: number; // mercator scale
  t: [number, number]; // mercator translate
}

export const COUNTRIES = countriesJson as Country[];
export const CITIES = citiesJson as Record<string, City[]>;
export const SILHOUETTES = silhouettesJson as unknown as Record<string, Shape>;
export const CITYSHAPES = cityshapesJson as unknown as Record<string, Shape>;
export const WORLD = worldmapJson as {
  width: number;
  height: number;
  paths: Record<string, string>;
};

// ---- Image quiz sets (dogs, cats, animals) — built by scripts/build-media.mjs.
export interface QuizItem {
  slug: string;
  name: string;
  images: string[]; // relative paths under public/
  facts?: Record<string, string | undefined>;
  hintOrder?: string[]; // which fact keys to reveal as progressive hints
}
export interface QuizSet {
  label: string;
  emoji: string;
  items: QuizItem[];
  hard?: boolean;
}
export const QUIZSETS = quizsetsJson as unknown as Record<string, QuizSet>;

// ---- Wordle word lists (built by scripts/build-words.mjs).
export interface WordData {
  lengths: number[];
  answers: Record<string, string[]>; // by length: common, kid-friendly answers
  allowed: Record<string, string[]>; // by length: valid guesses (full dictionary)
}
export const WORDS = wordsJson as unknown as WordData;

// ---- NBA teams (built by scripts/build-nba.mjs).
export interface NbaTeam {
  id: string;
  name: string; // nickname, e.g. "Lakers"
  city: string;
  full: string; // "Los Angeles Lakers"
  conf: 'East' | 'West';
  div: string;
  founded: number;
  titles: number;
  colors: [string, string];
  slug: string;
  logo: string; // relative path under public/
}
export const NBA = nbaJson as unknown as NbaTeam[];

export function matchTeam(input: string): NbaTeam | undefined {
  const q = input.trim().toLowerCase();
  if (!q) return undefined;
  return NBA.find(
    (t) =>
      t.full.toLowerCase() === q ||
      t.name.toLowerCase() === q ||
      t.city.toLowerCase() === q ||
      t.id.toLowerCase() === q,
  );
}

export function suggestTeams(input: string, exclude: Set<string> = new Set(), limit = 6): NbaTeam[] {
  const q = input.trim().toLowerCase();
  if (!q) return [];
  const hit = (t: NbaTeam) =>
    t.full.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || t.city.toLowerCase().includes(q);
  return NBA.filter((t) => !exclude.has(t.id) && hit(t)).slice(0, limit);
}

// ---- Brand logos (built by scripts/build-brands.mjs from simple-icons).
export interface Brand {
  slug: string;
  name: string;
  cat: string;
  hex: string;
  path: string; // SVG path in a 24x24 viewBox
}
export const BRANDS = brandsJson as unknown as Brand[];

export function suggestBrands(input: string, exclude: Set<string> = new Set(), limit = 6): Brand[] {
  const q = input.trim().toLowerCase();
  if (!q) return [];
  const starts = BRANDS.filter((b) => !exclude.has(b.slug) && b.name.toLowerCase().startsWith(q));
  const contains = BRANDS.filter((b) => !exclude.has(b.slug) && !b.name.toLowerCase().startsWith(q) && b.name.toLowerCase().includes(q));
  return [...starts, ...contains].slice(0, limit);
}

export const byId = new Map(COUNTRIES.map((c) => [c.id, c]));
export const byName = new Map(
  COUNTRIES.map((c) => [c.name.toLowerCase(), c]),
);

export type Difficulty = 1 | 2 | 3;

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: 'Easy',
  2: 'Medium',
  3: 'Hard',
};

/** Countries eligible as the hidden answer at a given difficulty. */
export function answerPool(difficulty: Difficulty): Country[] {
  return COUNTRIES.filter((c) => c.tier <= difficulty);
}

/** Countries that have a usable silhouette (some tiny islands don't render). */
export function silhouettePool(difficulty: Difficulty): Country[] {
  return answerPool(difficulty).filter((c) => SILHOUETTES[c.id]);
}

/** Look up a country by a (fuzzy-ish) typed name. */
export function matchCountry(input: string): Country | undefined {
  const q = input.trim().toLowerCase();
  if (!q) return undefined;
  const exact = byName.get(q);
  if (exact) return exact;
  return COUNTRIES.find(
    (c) =>
      c.name.toLowerCase() === q ||
      c.official.toLowerCase() === q ||
      c.cca2.toLowerCase() === q ||
      c.id.toLowerCase() === q,
  );
}

/** Shortest land path (cca3 list) between two countries via shared borders, or
 *  null if disconnected. BFS over the borders graph. */
export function borderPath(fromId: string, toId: string): string[] | null {
  if (fromId === toId) return [fromId];
  const prev = new Map<string, string>();
  const seen = new Set([fromId]);
  let frontier = [fromId];
  while (frontier.length) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const n of byId.get(id)?.borders ?? []) {
        if (seen.has(n) || !byId.has(n)) continue;
        seen.add(n);
        prev.set(n, id);
        if (n === toId) {
          const path = [toId];
          let cur = toId;
          while (cur !== fromId) { cur = prev.get(cur)!; path.unshift(cur); }
          return path;
        }
        next.push(n);
      }
    }
    frontier = next;
  }
  return null;
}

/** Suggestions for an autocomplete box. */
export function suggestCountries(input: string, limit = 6): Country[] {
  const q = input.trim().toLowerCase();
  if (!q) return [];
  const starts: Country[] = [];
  const contains: Country[] = [];
  for (const c of COUNTRIES) {
    const n = c.name.toLowerCase();
    if (n.startsWith(q)) starts.push(c);
    else if (n.includes(q)) contains.push(c);
  }
  return [...starts, ...contains].slice(0, limit);
}
