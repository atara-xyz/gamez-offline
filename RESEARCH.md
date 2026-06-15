# Geography Guessing Games — Research & Design Notes

Research backing the **Geo Games** offline suite. Goal: understand the genre of
Wordle-inspired daily geography games, distill the mechanics worth copying, and
map them to an offline, kid-friendly, learning-first implementation.

---

## 1. The genre at a glance

After Wordle (2021) went viral, a wave of "`-le`" daily puzzle clones appeared.
The geography branch is large and active. The shared DNA:

- **One puzzle per day** (a deliberate scarcity hook — we drop this for offline play).
- **A small fixed number of guesses** (usually 6).
- **Per-guess feedback** that narrows the answer (distance, direction, proximity, color).
- **Shareable emoji result grid** (the social/viral mechanic).
- **No accounts, no ads-blocking the game, instant load** — pure browser play.

What makes them *educational* is the feedback loop: every wrong guess teaches you
something concrete (this country is 4,000 km southeast; this silhouette has a long
coastline; this flag has three vertical stripes). Repetition across days builds a
mental atlas.

---

## 2. The major games and their mechanics

| Game | What you guess | Core feedback mechanic | What it teaches |
|------|----------------|------------------------|-----------------|
| **Globle** | Mystery country | Each guessed country is colored on a 3D globe by **proximity** (hot = close); shows km distance | Relative position, neighbors, country size |
| **Worldle** | Country from its **silhouette** | After each guess: **distance + compass direction (arrow) + proximity %** | Country shapes, where things are |
| **Tradle** | Country from its **export treemap** | Distance + direction (same as Worldle) | Economies, trade, what countries produce |
| **Travle** | A **path** between two countries | You name bordering countries to build a land route; tells you if a guess is on a valid shortest path | Borders, adjacency, regional geography |
| **Countryle** | Mystery country | Five attribute clues: continent, hemisphere, coordinates, population, avg. temperature | Demographics, climate, location |
| **Flagle** | Country from its **flag** (revealed in tiles) | Distance + direction after each guess | Flags, vexillology |
| **Statele** | US state from its outline | Distance + direction | US geography |
| **Cityle / city games** | A city | Distance/direction or attribute clues | Cities, capitals, populations |
| **Capitals quizzes** | Capital ↔ country matching | Right/wrong, multiple choice or typed | Capital cities |

### Mechanic primitives (the reusable building blocks)

These are the atoms every game above is built from. Our engine implements each
once and games compose them:

1. **Haversine distance** between two lat/lng points (great-circle km).
2. **Bearing / compass direction** from guess to target → an arrow emoji (8 or 16 points).
3. **Proximity %** — distance mapped to 0–100% where 100% = exact, via
   `max(0, 1 - distance / maxDistance)` (maxDistance ≈ half Earth circumference, ~20,000 km).
4. **Proximity color ramp** — distance mapped to a cold→hot color (Globle's globe coloring).
5. **Silhouette rendering** — project a country's GeoJSON to an SVG path (Worldle).
6. **Border adjacency graph** — which countries touch which (Travle path-finding).
7. **Attribute reveal** — disclose facts one at a time (Countryle).

---

## 3. Design decisions for an *offline, family* version

Constraints from the brief: **plays offline on a long flight**, on laptop **and**
iPad, for a parent + kids, **learning first**, with **everything pre-computed**.

### 3.1 Drop the "daily" limit
Daily puzzles exist to create a social/return hook. On a flight you want to play
for hours. So: **unlimited rounds**, with optional difficulty tiers and a
"daily" seeded mode kept only as a nostalgia option. A deterministic seed (date or
round number) keeps the parent-vs-kid "same puzzle" fairness when wanted.

### 3.2 Kid-friendly difficulty tiers
The full set of ~195 countries is brutal for young kids. We tier the answer pool:

- **Easy** — large/well-known countries (top ~40 by familiarity: big nations,
  popular travel spots).
- **Medium** — all countries with population over a threshold.
- **Hard** — every country and territory.

Tier only changes the **answer pool**; you can always *guess* any country.

### 3.3 Learning-first touches (beyond the original games)
- **Post-round fact card**: after each round, show the answer's flag, capital,
  population, region, neighbors, and a fun-size fact. The *teaching* happens here.
- **"Did you know" on each guess**: surface the guessed country's capital so even
  wrong guesses teach something.
- **No punishing failure**: reveal the answer with its fact card; no streak shame.
- **Two-player pass-and-play / score race** for parent vs kid.

### 3.4 The cities layer (the requested extension)
The brief: *"integrate cities in the countries once you guess them."* Design:

- Country data is pre-computed with its **top N cities** (by population), each with
  lat/lng and population.
- After you **correctly guess a country**, a **City round** unlocks for that
  country: guess its cities (capital first, then by size) using the same
  distance/direction feedback, but now *within* the country's bounding box and at
  city scale. This turns one country win into a deeper drill-down — exactly the
  "zoom in once guessed" idea.
- A standalone **Cityle** mode also exists: guess world cities directly.

### 3.5 Everything pre-computed
At build time (`scripts/build-data.mjs`) we bake a single static dataset so the
app needs **zero network at runtime**:

- Country list: ISO codes, names, capital, lat/lng centroid, region/subregion,
  population, area, flag emoji, bordering-country codes, a familiarity tier.
- Country **silhouette paths** (pre-projected SVG path strings, plus a normalized
  variant centered/scaled for the Worldle-style guess view).
- **Top cities per country** (name, lat/lng, population).
- Optionally a precomputed **distance matrix** is unnecessary — haversine is cheap
  enough to compute live — so we skip it to keep the bundle small. (We *could*
  precompute it; profiling says live is instant for <200 countries.)

The result is a static SPA + service worker (PWA). Build once, then it runs fully
offline; on iPad you "Add to Home Screen" to install it as an app.

---

## 4. The games we ship (v1)

1. **Globle** — guess the mystery country; guesses colored by proximity on a map,
   with km distance. *Teaches: position, neighbors.*
2. **Worldle (Shapes)** — guess the country from its silhouette; distance +
   direction + proximity % per guess. *Teaches: shapes, location.*
3. **Flagle (Flags)** — guess the country from its flag. *Teaches: flags.*
4. **Capitals** — name the capital of a shown country (or vice versa).
   *Teaches: capitals.*
5. **Cities (zoom-in)** — after a Globle/Worldle win, drill into that country's
   cities; plus a standalone world-cities mode. *Teaches: cities, scale.*

Each game shares: the same country dataset, the same distance/direction engine,
difficulty tiers, the post-round fact card, and pass-and-play scoring.

### Stretch / later
- **Travle** (border path-finding) — needs the adjacency graph (already in data).
- **Tradle** (exports) — needs trade data, omitted from v1 offline bundle.
- **Countryle** (attribute clues) — easy to add from existing fields.

---

## 4b. Wordle (the original word game) — research & build

The suite also includes **Wordle**, the word-guessing game the whole genre is
named after. Mechanics (verified against Wikipedia / TechRadar):

- Guess a hidden word in **6 tries**.
- Per-letter feedback: **green** = right letter, right spot; **yellow** = letter is
  in the word but a different spot; **gray** = not in the word.
- **Duplicate letters** use a two-pass rule: first mark all greens (consuming those
  answer letters), then mark yellows only against *remaining* answer letters. So if
  your guess has two E's but the answer has one, only one E lights up — the other is
  gray. (e.g. `EERIE` vs `REBEL` → `🟨🟩🟨⬛⬛`.)
- The daily answer is drawn from a **curated ~2,309 common words**, but guesses are
  validated against a much larger **~10,000-word** dictionary. Answers are never
  simple plurals (no `GOATS`). There's an optional **Hard Mode** (revealed hints
  must be reused).

**Our offline adaptation** (`scripts/build-words.mjs` → `src/data/words.json`):
- Difficulty sets **word length**: Easy = 4, Medium = 5 (classic), Hard = 6.
- **Answers** = the Google-10k common-word list ∩ an English dictionary, filtered to
  the length and de-pluralised — so answers stay kid-guessable.
- **Allowed guesses** = the full dictionary for that length (7k–30k words), so any
  real word is accepted.
- Unlimited rounds, on-screen + physical keyboard with letter-state coloring, and a
  shareable emoji grid. Fully offline like everything else.

## 5. Data sources (all available offline via npm at build time)

- **`world-countries`** — names, ISO codes, capitals, lat/lng, region, borders,
  flag emoji, area, population. MIT, ships as JSON.
- **`world-atlas`** (Natural Earth via TopoJSON) + **`topojson-client`** /
  **`d3-geo`** — country geometry for silhouettes and the map. Public domain data.
- **`all-the-cities`** — world cities with population ≥ 1,000 and ISO country code;
  we trim to the top N per country. ODbL data.

No runtime API calls. All of the above is consumed by the build script and frozen
into `src/data/*.json`.

---

## 6. Sources

- [Globle](https://globle-game.com/) · [Globle.org](https://globle.org/)
- [Worldle](https://worldle.teuteuf.fr/)
- [Countryle](https://www.countryle.com/)
- [Geography Wordles directory](https://geographywordles.org/)
- [Worldle vs Globle vs Travle compared (EarthGuessr)](https://www.earthguessr.com/blog/worldle-vs-globle-vs-travle-daily-geography-games)
- [Travle write-up (Geography Education)](https://geographyeducation.org/2023/11/28/travle-the-newest-geography-game/)
- [Daily Geography Games overview (Wartoft)](https://www.wartoft.se/daily_geography_games.aspx)
- [Wordle — Wikipedia](https://en.wikipedia.org/wiki/Wordle) · [What is Wordle? (TechRadar)](https://www.techradar.com/news/wordle)
- Word lists: [dwyl/english-words](https://github.com/dwyl/english-words) (dictionary) · [first20hours/google-10000-english](https://github.com/first20hours/google-10000-english) (common words)
