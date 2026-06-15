# Game ideas — flight backlog

A researched, **buildable** shortlist of small games to add to the suite. Filter
applied to everything here:

- **Fully offline** (no network at runtime — same contract as the rest of the app).
- **Small** — each is roughly a single self-contained `src/games/*.tsx`, hours not days.
- **Touch + keyboard** (works on iPad and laptop).
- Reuses what we already have where possible: the **word dictionary**
  (`words.json`), **countries/borders/cities/flags**, **NBA**, **animal/bird/dog
  photos**, and the shared **scoring + pass-and-play players**.

Effort: 🟢 small · 🟡 medium · 🔴 large. ★ = my top picks for the flight.

**Already built:** Geo Dash (cube+ship, coins, pads, procedural), Countryle, Travle,
Higher or Lower, Odd One Out, Hangman, Math Drill. Remaining strong candidates below
include 2048, Connect 4, Memory Match, Connections, Mastermind, Nerdle, Sudoku.

---

## A. Addictive time-killers (arcade / reflex, no data needed)

| Game | Effort | Why it's great |
|------|--------|----------------|
| ★ **2048** | 🟢 | The definitive one-more-go tile-merger. Swipe/arrows, per-player high score. Pure addiction. |
| ★ **Snake** | 🟢 | Everyone knows it; trivial to build; endless. |
| **Flappy / one-tap dodger** | 🟢 | Tap to flap through gaps. Brutally addictive, tiny code. |
| **Stack** | 🟢 | Tap to drop and stack shrinking blocks — "just one more". |
| **Tower / Doodle jump** | 🟡 | Bounce upward, don't fall. Great high-score chaser. |
| **Brick breaker (Breakout)** | 🟡 | Paddle + ball + bricks. Satisfying. |
| **Hextris** | 🟡 | Tetris on a spinning hexagon. |
| **Tetris** | 🟡 | The classic; a bit more work (rotation/line-clear/levels). |
| **Reaction / Whack-a-mole** | 🟢 | Tap targets fast; measures reaction time — fun head-to-head. |
| **Simon (memory sequence)** | 🟢 | Repeat the growing colour/sound pattern. |

## B. Brain & logic puzzles (single-player, daily-style)

| Game | Effort | Why it's great |
|------|--------|----------------|
| ★ **Mastermind / Code breaker** | 🟢 | Wordle-with-colours; crack the secret peg code. Pure logic. |
| ★ **Nerdle (math Wordle)** | 🟢 | Guess the hidden equation; we generate solvable equations. Sneaky-educational. |
| ★ **Connections** | 🟡 | Group 16 items into 4 secret sets. We can auto-build themed groups from OUR data (countries by continent, NBA by division, animals by class, words by category) — addictive *and* educational. |
| ★ **Memory match (pairs)** | 🟢 | Flip-and-match grid using flags / NBA logos / animal photos we already bundle. Kid gold, reuses assets. |
| **Sudoku (bundled pack)** | 🟡 | Ship a pre-generated puzzle pack (🟢) instead of a live generator (🔴). Huge appeal. |
| **Lights Out** | 🟢 | Toggle the grid to all-off. Tiny, brain-bending. |
| **Flood-It** | 🟢 | Flood the board to one colour in N moves. Quick + colourful. |
| **15-puzzle (slide tiles)** | 🟢 | Classic sliding tile; can use a picture (a flag/animal) as the image. |
| **Nonogram / Picross** | 🟡 | Paint-by-logic grid. Deep, satisfying. |
| **Minesweeper** | 🟡 | The all-time logic time-killer. |
| **2048-style "Threes"** | 🟢 | Variant of 2048. |

## C. Educational (lean on our existing data)

| Game | Effort | Why it's great |
|------|--------|----------------|
| ★ **Higher or Lower** | 🟢 | Two countries (or NBA teams) — which has more people / bigger area / more titles? Endless, addictive, data we already have. |
| ★ **Travle (border hop)** | 🟡 | Build a land route between two countries by naming the ones that border each other. We already have the borders graph. Teaches neighbours. |
| ★ **Countryle (attribute clues)** | 🟢 | Guess the country from drip-fed clues (continent, hemisphere, population band, landlocked, first letter). All fields already exist. |
| **Where is it? (map tap)** | 🟡 | Name shown → tap the country on the world map. Reverse-Globle; we have the map paths. |
| **Times-tables / Math drill** | 🟢 | Speed arithmetic with levels. Perfect quick win for kids. |
| **24 game** | 🟡 | Make 24 from four numbers (+−×÷). Mental-math classic. |
| **Typing race** | 🟢 | Type the shown words fast; uses our dictionary. Builds keyboard skills. |
| **Hangman** | 🟢 | Guess the word letter-by-letter; uses our word list. Two-player friendly. |
| **Odd one out** | 🟢 | Four items, three share a trait (region, class, division). Quick logic + facts. |
| **Currency / Money match** | 🟢 | Match country ↔ currency (small data add). |

## D. Two-player pass-and-play (one iPad between two kids ✈️)

| Game | Effort | Why it's great |
|------|--------|----------------|
| ★ **Connect 4** | 🟢 | Drop discs, get four in a row. The perfect shared-screen flight game. |
| ★ **Dots & Boxes** | 🟡 | Claim squares by drawing lines. Deceptively deep, great for siblings. |
| **Tic-tac-toe / Ultimate TTT** | 🟢/🟡 | Plain is trivial; "ultimate" (9 boards) is a real strategy game. |
| **Battleship** | 🟡 | Hidden fleets, take turns firing. Pass-and-play with a "look away" screen. |
| **Reaction duel** | 🟢 | Two halves of the screen; first to tap when it flashes wins. Instant fun. |
| **Quiz buzzer race** | 🟢 | Reuse Capitals / NBA / Animals questions; first to buzz + answer scores. |
| **Word duel / Categories** | 🟡 | A letter is drawn; both race to name an animal/country/food starting with it. |

---

## Recommended first batch (max fun-per-hour, all 🟢, mostly offline-native)

If we do one focused session, this set covers every vibe — arcade, brain, learning,
and two-player — and several reuse assets/data we already ship:

1. **2048** — the headline addictive time-killer.
2. **Connect 4** — the headline two-player flight game.
3. **Memory Match** — flip-and-match flags / NBA logos / animal photos (reuses assets).
4. **Higher or Lower** — endless, data-driven, surprisingly addictive.
5. **Mastermind** — pure logic, tiny.
6. **Countryle** — quick educational win from existing country data.
7. **Hangman** — reuses the word list; two-player friendly.

Stretch (🟡, higher ceiling): **Connections** (data-driven groups), **Travle**
(border hop), **Sudoku pack**, **Nerdle**.

All slot into the existing menu under a new **"Arcade"** / **"2-Player"** category,
use the shared difficulty + pass-and-play scoring, and stay fully offline.
