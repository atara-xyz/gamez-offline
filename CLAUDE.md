# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Geo Games** — an offline, install-to-home-screen geography game suite (Globle /
Worldle / Flagle / Capitals / Cities) built for a family to play on a long flight,
on laptop and iPad, with **no network at runtime**. Learning-first. See
`RESEARCH.md` for the genre study and design rationale that drives the feature set.

## Commands

```bash
npm install         # once
npm run data        # regenerate src/data/*.json (geo) from the npm data packages
npm run media       # download+resize dog/cat/animal images -> public/media + quizsets.json
npm run media dogs  # (or cats | animals) rebuild just one image set
npm run icons       # render PNG app icons (incl. iOS apple-touch-icon) from a master SVG
npm run words       # fetch+bake the Wordle dictionaries -> src/data/words.json (one-time)
npm run certs -- <lan-ip>  # generate a local CA + HTTPS cert so iPad offline works (see below)
npm run nba         # fetch 30 NBA logos (ESPN) + bake src/data/nba.json (one-time)
npm run brands      # bake src/data/brands.json from the simple-icons package (offline)
npm run media flowers  # download the 90-flower photo set (iNaturalist)
npm run dev         # Vite dev server (HMR) at http://localhost:5173
npm run build       # data + typecheck (tsc --noEmit) + vite build -> dist/
npm run preview     # serve the production build at http://localhost:4173 --host
```

`npm run media` is slow (network) and NOT part of `npm run build` — run it once to
populate the image games. `public/media` and `src/data/quizsets.json` reference each
other; `public/media` is gitignored (large), so a fresh clone needs `npm run media`
before the Dogs/Cats/Animals games show images (they degrade gracefully with an
"install" message until then).

There is no unit-test runner or linter configured. Correctness is guarded by
`tsc --noEmit` (strict, `noUnusedLocals`/`noUnusedParameters` on) which runs as
part of `npm run build`. Game/data logic is plain functions in `src/geo.ts` and
`src/data.ts` — verify changes with quick `node -e` scripts against
`src/data/*.json` rather than a framework.

For UI/gameplay verification there is a Playwright smoke-drive that opens each
game, plays a move, screenshots to `scripts/shots/`, and asserts no console
errors: start `npm run preview`, then `node scripts/drive.mjs`. Use it to confirm
flags render (Windows Chrome can't render flag *emoji* — see below), pins align,
and difficulty hint-gating works.

## The offline-first contract (most important architectural fact)

**Nothing is fetched at runtime.** All geography data is *pre-computed at build
time* by `scripts/build-data.mjs` and frozen into `src/data/*.json`, which is then
**imported as ES modules** (so it inlines into the JS bundle). The `base: './'` in
`vite.config.ts` is deliberate so `dist/` works when opened from a file path or any
subfolder. If you add a new data source, it must flow through the build script —
never add a `fetch()` to runtime code.

**Offline caching is split in two (important — don't merge it back):**
1. **App shell precache** (`workbox.globPatterns`, ~6 MB): JS (all geo data inlined
   here), CSS, HTML, flags (svg), icons (png), fonts — and `globIgnores: media/**`.
   This installs atomically and reliably, so every map/flag/word game works offline
   the moment the SW activates. `navigateFallback: 'index.html'` serves the shell
   for offline navigations.
2. **Photos** (`workbox.runtimeCaching`, `CacheFirst`, cache `geo-photos`): the
   ~2,200 webp images are NOT precached — a 49 MB atomic precache fails if any one
   file hiccups on phone Wi-Fi, which breaks offline entirely (this actually
   happened). They're cached at runtime, and `OfflineStatus.tsx` pre-fetches them
   all into the `geo-photos` cache on demand (`caches.open(...).add()` with a
   progress bar) so the image games also work offline. Adding a new image type?
   Keep it OUT of `globPatterns` and let runtimeCaching handle it.

`scripts/populations.json` was fetched once from restcountries.com and committed,
because `world-countries` has no population field. The build script reads it
offline. Re-fetch it only intentionally.

The image games follow the same build-time-fetch / runtime-offline contract:
`scripts/build-media.mjs` pulls photos from dog.ceo, TheCatAPI, and iNaturalist
(all keyless), resizes to small WebP with `sharp`, and writes `quizsets.json`.
iNaturalist rate-limits (returns XML error pages) so `getJSON` retries with
backoff; animal common names are resolved to animal-only taxa (an `OVERRIDES` map
+ `verify-animals.mjs` dry run catch mis-resolutions like Tiger→a butterfly).
**The service worker precaches webp** (see `vite.config.ts globPatterns`) so images
work offline — if you add a new media type, add its extension there too.

## iOS offline needs HTTPS (secure-origin rule)

Service workers — hence offline/PWA — only work on a **secure origin**: `https://`
or `localhost`. A `http://<lan-ip>` URL (how the iPad reaches the laptop) is NOT
secure, so iOS silently disables offline there (this bit us — the app appeared to
need internet on the iPad). `scripts/build-certs.mjs` (`npm run certs -- <ip>`)
mints a local CA + a server cert (with the LAN IP in the SAN, EKU `serverAuth`,
<825-day validity for iOS) into `certs/`, and copies the CA to
`public/rootCA.{pem,crt}` so the iPad can download+trust it. `vite.config.ts` serves
HTTPS for `server`+`preview` when `certs/cert.pem` exists. `OfflineStatus.tsx`
detects an insecure origin (`!('serviceWorker' in navigator)`) and shows a
"⚠ Offline needs HTTPS" chip instead of silently rendering nothing.

## Data pipeline (`scripts/build-data.mjs`)

Consumes three npm packages and emits four JSON files into `src/data/`:

`scripts/build-words.mjs` also strips **proper nouns** (names & places) from the
Wordle/Hangman pools: it blocks country/capital/major-city names + popular given
names (from a baby-names dataset, gated at ≥0.2% popularity so rare word-names like
"river"/"stone" survive), keeps a dual-use allowlist (china, polish, grace, march…),
and does NOT block demonyms (french/dutch are real words).

Two cross-cutting runtime helpers in `src/ui.tsx`:
- `useRoundPick(pool, round, {seed,salt,key})` — replaces the old
  `useMemo(()=>pick(pool,rng))` answer pattern in every round game; it avoids the
  last ~5 answers so you never get the same flag/word/team twice in a row. For games
  that remount a child per round (ImageGuess), the pick lives in the persistent
  wrapper so the recent-history ref survives.
- Hint gating (`hintsFor` + `GuessList`): distance/proximity/direction are all hidden
  on Hard so the "Hard — no help!" label is truthful (distance used to leak through).

- `world-countries` → country facts (codes, capital, lat/lng centroid, region,
  borders, flag emoji, area). Keyed by **cca3** (e.g. `DEU`).
- `world-atlas` TopoJSON + `topojson-client` + `d3-geo` → geometry. Atlas features
  are keyed by **numeric ccn3**; the script maps cca3↔ccn3 via `world-countries`.
  Produces `silhouettes.json` (each country individually fit to a 100×100 box via
  `geoMercator().fitExtent`, used by Worldle) and `worldmap.json` (all countries in
  one shared `geoEquirectangular` 800×400 projection, used by Globle to color
  guesses on a map).
- `all-the-cities` → top 12 cities per country by population (`cities.json`).
- `flag-icons` → real SVG flags copied to `public/flags/<cca2>.svg` (gitignored,
  regenerated by `npm run data`). **Flag emoji are NOT used** — Windows/Chrome
  render them as the two-letter code (`SN`, `DE`) instead of a flag, so all flags
  go through the `<Flag cca2=…>` component (`src/ui.tsx`) which loads the SVG.

`silhouettes.json` stores, per country, `{ d, k, t }` — the SVG path plus the
mercator `scale` and `translate`. `src/shape.ts` (`countryProjector`) rebuilds that
exact projection at runtime so the Cities deep-dive plots city lat/lng as dots that
land on the real country outline.

Difficulty also gates **hints** at runtime (not just the answer pool): see
`hintsFor` in `CountryGuessGame.tsx` — Easy = map + compass direction + proximity,
Medium = map + proximity (no direction), Hard = clue only (no map/direction/proximity).

Difficulty **tier** is assigned here: tier 1 = a hand-curated `EASY` set of
kid-familiar countries, tier 2 = population ≥ 3M, tier 3 = everything. The runtime
answer pool for difficulty *D* is all countries with `tier <= D` (see
`answerPool`/`silhouettePool` in `src/data.ts`). To change what kids see in Easy
mode, edit the `EASY` set and re-run `npm run data`.

## Players & scoring

- `src/players.ts` (`usePlayers`) — players persisted in `localStorage` (`geo-players-v1`):
  name, cumulative `points`, `rounds`, and a per-game breakdown. `recordRound(game,
  points)` updates the active player then round-robins to the next (pass-and-play).
  Managed via `PlayersModal` (`PlayersModal.tsx` — note the casing, kept distinct
  from `players.ts`).
- `src/scoring.ts` — fair, comparable **0–100 per round** so totals mean the same
  across games: `roundScore` (6-guess games: 1st try 100 → last ≈17), `globeScore`
  (unlimited-guess decay), `quizScore` (Capitals), `proportionScore` (Name the NBA).
  **Every game's `onResult` is `(win, points)`** — the game computes points; App's
  `record` forwards them to `recordRound`.
- `useEnterToAdvance(over, onNext)` in `ui.tsx` — global: once a round is over,
  Enter advances to the next round (so it's type → Enter → Enter). Wired into every
  round-based game. It only listens while `over` is true, so the submitting Enter
  can't also advance.
- Wordle has two **jokers** (`src/games/Wordle.tsx`): "Reveal a letter" (last 3
  guesses only) and "Place a letter" (position of a known yellow). Each deducts
  `JOKER_COST` (25) from the round score.

## Runtime architecture

- `src/geo.ts` — the shared math primitives every game composes: `distanceKm`
  (haversine), `bearing`/`directionArrow`, `proximityPct`, `proximityColor`
  (Globle's hot/cold ramp), `proximitySquare` (shareable emoji grid). Distances use
  **country centroids**, so e.g. DEU→FRA ≈ 758 km (centroid-to-centroid, not
  capital-to-capital) — this is expected and matches the real games.
- `src/data.ts` — typed loaders + lookups (`byId`, `matchCountry`,
  `suggestCountries`, `answerPool`).
- `src/games/CountryGuessGame.tsx` — **one shared shell** for Globle, Worldle, and
  Flagle. They differ only by the `mode` prop, which selects a clue renderer
  (`WorldMap` / `Silhouette` / `FlagReveal`) and a guess limit. Add a new
  country-guessing variant here rather than copying the shell.
- `src/games/Cities.tsx` — the "zoom in once you've guessed the country" mode.
  Either scoped to one country (reached via the fact card's *Explore cities*
  button, which calls `App`'s `exploreCities`) or whole-world. Builds its own local
  equirectangular projection on the fly to plot city pins.
- `src/games/Capitals.tsx` — multiple-choice quiz (distractors biased to the same
  region).
- `src/games/Nba*.tsx` — four basketball games (NbaLogo / NbaNameAll / NbaClues /
  NbaColors) sharing `NbaShared.tsx` (logo, autocomplete, fact card) and `NBA`
  (`src/data/nba.json`, 30 teams + facts). Logos are `public/nba/<id>.png` — PNG so
  they land in the app-shell precache (small, offline). The menu groups games by a
  `cat` field (Geography / Words / Nature / Basketball).
- `src/games/GeoDash.tsx` — a one-touch skill runner (Geometry-Dash-style) in the
  **Arcade** menu group. Canvas + `requestAnimationFrame`; all mutable game state in
  a `useRef` (no per-frame React re-render — overlay status is the only React state).
  FOUR vehicles swapped by portals (cycle `ORDER`): **cube** (jump), **ship** (hold
  to fly), **wave** (45° zig-zag — hold up / release down), **ball** (tap flips
  gravity). Plus jump-pads and 🪙 coins; spikes/blocks can be floor or ceiling
  (`ceil` flag). **Procedural sections** (`genCube`/`genShip`/`genWave`/`genBall`):
  `cursor` is an ABSOLUTE world-x and sections switch at absolute distances (this is
  load-bearing — comparing a screen-x to the threshold means the portal never spawns).
  `window.__dashForce(mode)` is a test-only hook to exercise a vehicle directly.
  Personal best in `localStorage` (`geo-dash-best`); does NOT feed the shared scoreboard.
- `src/games/BrandLogos.tsx` — guess-the-brand-from-logo (Flagle-style), data from
  `BRANDS` (`src/data/brands.json`, baked from the `simple-icons` npm package — SVG
  path + brand hex, fully offline). Own "Brands" menu category.
- `src/games/DressUp.tsx` — Dress to Impress: style a pure-SVG model from tagged
  wardrobe pieces; score = how many slots' tags match the round's theme. No assets.
- `src/games/RetroGames.tsx` — canvas-rendered C64/Atari **Summer/Winter/California
  Games** homage with animated athletes (shared `runner`/`crowd` draw helpers). Five
  events: Sprint + Hurdles (mash ←/→, Space to jump), Ski Slalom (steer through
  gates) + Ski Jump (power→lean→flight), Halfpipe (HOLD to pump/spin). Each event is
  a self-contained component with its own canvas+rAF and a `localStorage` best.
- `src/games/SketchIt.tsx` + `doodles.ts` — "drawing Wordle": draw the prompt on a
  canvas, then `scoreDrawing()` rates it 0–100 OFFLINE by normalizing your strokes
  (uniform scale + center, so position/size don't matter) and combining coverage +
  precision (F1), with a neatness penalty so scribbles score low. Verdict is phrased
  as "{score}% {name}" (e.g. "82% bicycle"). `DOODLES` templates are stroke polylines
  in a 0..100 box; difficulty controls the on-screen guide (full/dots/none).
- `Flowers` reuses `ImageGuess` + the iNaturalist `buildSpecies` pipeline (Plantae,
  genus-level via `FLOWER_OVERRIDES` since a bare query often hits too-broad taxa).
- Educational data-driven games: `Countryle` (attribute-clue country guess),
  `Travle` (border-hop path; uses `borderPath`/BFS in `data.ts`), `HigherLower`
  (population streak), `OddOneOut` (three-share-a-trait), `Hangman` (uses `WORDS`),
  `MathDrill` (timed arithmetic, own "Math" menu category). All use the shared
  scoring + `useEnterToAdvance`/`useAutoFocus`.
- `src/games/Wordle.tsx` — the classic word game (not Worldle). Self-contained:
  difficulty sets word length (4/5/6), `score()` does the two-pass green/yellow/gray
  with correct duplicate handling, on-screen + physical keyboard. Words come from
  `WORDS` (`src/data/words.json`): `answers[len]` (common words) and `allowed[len]`
  (full dictionary for guess validation).
- `src/games/ImageGuess.tsx` — one shared component for **Dogs / Cats / Animals**.
  Reads a set from `QUIZSETS` (`src/data/quizsets.json`); shows photos (more on
  Easy, +1 per wrong guess), reveals progressive hints from each item's `facts`
  (cats: Origin/Temperament; animals: Class/Order/Family taxonomy). Images are
  `public/media/<set>/<slug>/<n>.webp`, referenced via `import.meta.env.BASE_URL`.
- `src/App.tsx` — owns: selected game, difficulty (shared across games),
  pass-and-play players/scores, and the country→cities hand-off. Each game is
  remounted via a `key` that includes difficulty so changing difficulty starts a
  fresh round.
- `src/ui.tsx` — shared `CountryGuessInput` (autocomplete), `GuessList`,
  `FactCard` (the post-round teaching card).

## Conventions

- Countries are identified by **cca3** everywhere internally; `cca2` is only used to
  join `all-the-cities` (which keys by ISO-2) during the build.
- A round is restarted by remounting the game component with a changed `key`, not by
  internal reset logic in the parent.
- Determinism: games accept an optional `seed`; with a seed, `mulberry32` makes the
  answer reproducible (for fair same-puzzle head-to-head). Currently `App` doesn't
  pass a seed (rounds are random) — wire `seed` through if adding a "daily"/fair
  mode.
