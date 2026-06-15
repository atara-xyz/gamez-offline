# 🌐 Geo Games

An **offline** geography game suite for the family — Globle, Worldle, Flagle,
Capitals, and a zoom-in Cities mode. Built to keep a parent and kids learning the
world during a long flight, on a **laptop and an iPad**, with **no internet**.

Inspired by the daily geography "`-le`" games (Globle, Worldle, Tradle, Travle,
Countryle…). See [`RESEARCH.md`](./RESEARCH.md) for the genre study and design.

## The games

| Game | What you do | Learns |
|------|-------------|--------|
| 🌍 **Globle** | Guess the mystery country; your guesses glow hot/cold on a world map by distance | Where countries are, neighbors |
| 🗺️ **Worldle** | Name the country from its silhouette (6 guesses, distance + proximity feedback) | Country shapes |
| 🚩 **Flagle** | Guess the country from its flag (de-blurs as you guess) | Flags |
| 🏛️ **Capitals** | Multiple-choice: pick the right capital | Capitals |
| 🏙️ **Cities** | Zoom in — after you win a country, drill into *its* cities on the real country map | Cities, scale |
| 🐕 **Dog Breeds** | Name the dog breed from real photos (more reveal as you guess) | ~150 breeds |
| 🐈 **Cat Breeds** | Name the cat breed; Origin & Temperament hints | ~66 breeds |
| 🦁 **Animals** | Hard! Name the species; Class→Order→Family taxonomy hints | ~150 species |
| 🦜 **Birdle** | Name the bird from photos; Order→Family→Class hints | 117 species worldwide |
| 🔤 **Wordle** | Guess the hidden word in 6 tries (Easy=4, Med=5, Hard=6 letters) | spelling, vocab |
| 🏀 **NBA Logos** | Guess the NBA team from its logo (de-blurs as you guess) | 30 teams |
| 📋 **Name the NBA** | Name all 30 NBA teams from memory, filled into a division grid | teams, divisions |
| 🔎 **NBA Clues** | Guess the team from clues: conference, division, city, titles… | team facts |
| 🎨 **NBA Colors** | Guess the team from just its two colors. Tricky! | team colors |
| 🟦 **Geo Dash** | One-touch runner — **cube · ship · wave · ball** modes (portals), jump pads, 🪙 coins, procedural levels | reflexes, timing |
| 🕹️ **Retro Games** | Canvas C64/California-Games meet: **Sprint · Hurdles · Ski Slalom · Ski Jump · Halfpipe** | reflexes |
| ✏️ **Sketch It** | Drawing Wordle — draw the prompt (a bicycle!), get rated on its "X-ness" offline | drawing |
| 👗 **Dress to Impress** | Style the SVG model to a theme, then get a runway score | creativity |
| 🏷️ **Brand Logos** | Guess the brand from its (de-blurring) logo — 80+ brands by category | brands |
| 🌸 **Flowers** | Name the flower from photos; plant-family hints — 90 kinds | botany |
| 🧭 **Countryle** | Guess the country from attribute clues (region, direction, population, area) | country facts |
| ✈️ **Travle** | Build a land route between two countries by naming bordering ones | borders, regions |
| 📊 **Higher or Lower** | More or fewer people? Build a streak | populations |
| 🧩 **Odd One Out** | Four countries, three share a trait — spot the odd one | regions, traits |
| 🪢 **Hangman** | Guess the word letter-by-letter before your lives run out | spelling, vocab |
| ➗ **Math Drill** | Answer as many sums as you can in 60 s (+−, ×tables, ÷) | mental math |

Extras: **Easy / Medium / Hard** difficulty (Easy = ~55 kid-familiar countries),
**pass-and-play** scoring for 2–4 players, and a **learning fact card** after every
country (capital, population, neighbors, area).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173  (development, hot reload)
# or a production build:
npm run build
npm run preview    # http://localhost:4173
```

## Play it offline (the whole point)

Everything (country facts, shapes, flags, cities, distances) is pre-computed into
`src/data/*.json` at build time and baked into the app + a service-worker cache, so
**no network is used while playing**.

### On the laptop, on the plane
Run a local server — it serves from `localhost`, so it works with Wi-Fi off:

```bash
npm run build
npm run preview        # then open http://localhost:4173 in your browser
```

(That's it. The data is inside the app; the server is purely local.)

### On the iPad / iPhone (install once, then fully offline)

> **Why this needs a few extra steps:** iOS only enables offline mode (service
> workers) on a **secure origin** — `https://`, not `http://<ip>`. So the laptop
> serves HTTPS with a local certificate that you trust on the iPad once.

**One-time setup on the laptop** (gives you certs valid for your Wi-Fi IP):
```bash
npm run certs -- 192.168.50.8   # use your laptop's Wi-Fi IP (auto-detected too)
npm run build
npm run preview                 # now serves https://192.168.50.8:4173
```

**On the iPad** (same Wi-Fi as the laptop; the laptop's hotspot is fine — no
internet needed):
1. **Install the certificate.** In **Safari** open
   `https://192.168.50.8:4173/rootCA.crt`. You'll get a "Not Private" warning the
   first time — tap **Show Details → visit this website** → it downloads a profile
   ("Profile Downloaded").
2. **Settings → General → VPN & Device Management** → tap **Geo Games Local CA** →
   **Install** (enter passcode) → **Install**.
3. **Settings → General → About → Certificate Trust Settings** → turn **ON** full
   trust for **Geo Games Local CA**.
4. Back in **Safari**, open `https://192.168.50.8:4173` — now it loads securely (no
   warning) and the header shows a **status chip**.
5. Tap the chip → **"Save photos for offline (~48 MB)"** and wait for the bar to
   reach **"✓ Ready offline"** (the maps/flags/word games are already cached; this
   step is just the animal/breed photos).
6. Tap **Share → Add to Home Screen → Add**.
7. Open it from the home-screen icon, then go into **airplane mode** — everything
   plays. ✈️

> The certificate is valid for ~2 years. If your laptop's Wi-Fi IP changes, re-run
> `npm run certs -- <new-ip>` and rebuild. iOS may evict a PWA's cache after weeks
> unused, so open the app once shortly before you fly.

### Optional: host it online
It's a static site — `dist/` can be dropped on any static host (e.g. `vercel deploy`)
for an online version. Offline install still works from the hosted URL.

## Regenerating data
Country/city/shape data comes from the `world-countries`, `world-atlas`, and
`all-the-cities` npm packages. To rebuild after changing difficulty tiers or the
city count:

```bash
npm run data
```

The **image games** (Dogs/Cats/Animals) download real photos once at build time
(from dog.ceo, TheCatAPI, iNaturalist), resize them to small WebP, and bundle them
for offline play (~35 MB total). They're not committed — run this once before a
trip:

```bash
npm run media            # all three sets (needs internet, a few minutes)
npm run media dogs       # or just one set: dogs | cats | animals
```

The **Wordle** word lists are likewise fetched once and baked into
`src/data/words.json` (committed, ~460 KB — no need to re-run unless refreshing):

```bash
npm run words            # rebuild the offline dictionaries
```

The **NBA games** use 30 team logos fetched once from ESPN's CDN (resized to small
PNG, bundled for offline) plus curated team facts:

```bash
npm run nba              # rebuild public/nba/*.png + src/data/nba.json
```

See [`CLAUDE.md`](./CLAUDE.md) for architecture details.
