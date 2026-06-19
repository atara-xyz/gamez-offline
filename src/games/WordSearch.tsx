// Word Search — a wall of letters with hidden words. Drag across a straight run of
// cells to claim a word. Difficulty scales the grid, the number of words, and the
// directions: Easy is →/↓ only, Medium adds diagonals, Hard adds every direction
// (including backwards). Words come from the cleaned Wordle pool (no names/places).
import { useEffect, useMemo, useRef, useState } from 'react';
import { type Difficulty, WORDS } from '../data';
import { mulberry32 } from '../random';
import { useEnterToAdvance } from '../ui';

interface Placed {
  word: string;
  cells: [number, number][];
}
interface Puzzle {
  size: number;
  grid: string[];
  words: Placed[];
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PALETTE_N = 6; // number of distinct "found" colors (ws-f0…ws-f5)
const HINT_COST = 25;

type Cfg = { size: number; count: number; lens: number[]; dirs: [number, number][] };
// dirs are [dRow, dCol]. Including negative dirs = words read backwards/up.
const CFG: Record<Difficulty, Cfg> = {
  1: { size: 9, count: 6, lens: [4, 5], dirs: [[0, 1], [1, 0]] },
  2: { size: 12, count: 8, lens: [4, 5, 6], dirs: [[0, 1], [1, 0], [1, 1], [-1, 1]] },
  3: {
    size: 14,
    count: 10,
    lens: [5, 6],
    dirs: [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]],
  },
};

/** Build a solvable puzzle: place words first, then fill the gaps with noise. */
function generate(difficulty: Difficulty, round: number, seed?: number): Puzzle {
  const cfg = CFG[difficulty];
  const rng = seed != null ? mulberry32(seed + round * 7919 + difficulty) : Math.random;
  const size = cfg.size;

  // Candidate words across the allowed lengths, shuffled.
  const pool: string[] = [];
  for (const L of cfg.lens) for (const w of WORDS.answers[L] || []) pool.push(w.toUpperCase());
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const grid: (string | null)[] = Array(size * size).fill(null);
  const placed: Placed[] = [];
  const used = new Set<string>();

  for (const word of pool) {
    if (placed.length >= cfg.count) break;
    if (used.has(word) || word.length > size) continue;
    const len = word.length;
    for (let attempt = 0; attempt < 120; attempt++) {
      const [dr, dc] = cfg.dirs[Math.floor(rng() * cfg.dirs.length)];
      // Valid start range so the whole word stays on the board.
      const rMin = dr < 0 ? len - 1 : 0;
      const rMax = dr > 0 ? size - len : size - 1;
      const cMin = dc < 0 ? len - 1 : 0;
      const cMax = dc > 0 ? size - len : size - 1;
      if (rMax < rMin || cMax < cMin) continue;
      const r0 = rMin + Math.floor(rng() * (rMax - rMin + 1));
      const c0 = cMin + Math.floor(rng() * (cMax - cMin + 1));
      // Cells must be empty or already hold the matching letter (crossword overlap).
      const cells: [number, number][] = [];
      let ok = true;
      for (let i = 0; i < len; i++) {
        const r = r0 + dr * i;
        const c = c0 + dc * i;
        const at = grid[r * size + c];
        if (at !== null && at !== word[i]) { ok = false; break; }
        cells.push([r, c]);
      }
      if (!ok) continue;
      for (let i = 0; i < len; i++) grid[cells[i][0] * size + cells[i][1]] = word[i];
      placed.push({ word, cells });
      used.add(word);
      break;
    }
  }

  const filled = grid.map((ch) => ch ?? ALPHABET[Math.floor(rng() * 26)]);
  return { size, grid: filled, words: placed };
}

interface Cell { r: number; c: number; }

/** The straight line of cells from a→b, or null if not a row/col/diagonal. */
function lineCells(a: Cell, b: Cell): Cell[] | null {
  const dr = b.r - a.r;
  const dc = b.c - a.c;
  const adr = Math.abs(dr);
  const adc = Math.abs(dc);
  if (!(dr === 0 || dc === 0 || adr === adc)) return null;
  const steps = Math.max(adr, adc);
  const sr = Math.sign(dr);
  const sc = Math.sign(dc);
  const out: Cell[] = [];
  for (let i = 0; i <= steps; i++) out.push({ r: a.r + sr * i, c: a.c + sc * i });
  return out;
}

const sameCells = (a: Cell[], b: [number, number][]) =>
  a.length === b.length && a.every((p, i) => p.r === b[i][0] && p.c === b[i][1]);

export function WordSearch({
  difficulty,
  seed,
  onResult,
}: {
  difficulty: Difficulty;
  seed?: number;
  onResult: (win: boolean, points: number) => void;
}) {
  const [round, setRound] = useState(0);
  const puzzle = useMemo(() => generate(difficulty, round, seed), [difficulty, round, seed]);

  const [found, setFound] = useState<Record<string, number>>({});
  const [hints, setHints] = useState(0);
  const [sel, setSel] = useState<Cell[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const startRef = useRef<Cell | null>(null);
  const selRef = useRef<Cell[] | null>(null);
  const reported = useRef(false);

  // Cell → palette index for every cell belonging to a found word.
  const foundCells = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of puzzle.words) {
      const idx = found[p.word];
      if (idx == null) continue;
      for (const [r, c] of p.cells) m.set(r + ',' + c, idx);
    }
    return m;
  }, [found, puzzle]);
  const selSet = useMemo(() => new Set((sel || []).map((p) => p.r + ',' + p.c)), [sel]);

  const foundCount = puzzle.words.filter((p) => found[p.word] != null).length;
  const over = puzzle.words.length > 0 && foundCount === puzzle.words.length;

  // Report the round score exactly once, when the last word is found.
  useEffect(() => {
    if (over && !reported.current) {
      reported.current = true;
      onResult(true, Math.max(30, 100 - hints * HINT_COST));
    }
  }, [over, hints, onResult]);

  function cellFromPoint(x: number, y: number): Cell | null {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const r = el?.dataset?.r;
    const c = el?.dataset?.c;
    if (r == null || c == null) return null;
    return { r: +r, c: +c };
  }

  function finalize() {
    const cells = selRef.current;
    startRef.current = null;
    selRef.current = null;
    setSel(null);
    setDragging(false);
    if (!cells || cells.length < 2) return;
    const match = puzzle.words.find(
      (w) => sameCells(cells, w.cells) || sameCells(cells, [...w.cells].reverse()),
    );
    if (!match) return;
    setFound((f) => (f[match.word] != null ? f : { ...f, [match.word]: Object.keys(f).length % PALETTE_N }));
  }

  // Drag tracking via pointer + elementFromPoint so it works for mouse AND touch.
  useEffect(() => {
    if (!dragging) return;
    function move(e: PointerEvent) {
      if (!startRef.current) return;
      const cell = cellFromPoint(e.clientX, e.clientY);
      if (!cell) return;
      const cells = lineCells(startRef.current, cell);
      if (cells) {
        selRef.current = cells;
        setSel(cells);
      }
    }
    function up() {
      finalize();
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, puzzle]);

  function down(r: number, c: number, e: React.PointerEvent) {
    if (over) return;
    e.preventDefault();
    const cell = { r, c };
    startRef.current = cell;
    selRef.current = [cell];
    setSel([cell]);
    setDragging(true);
  }

  function revealHint() {
    const rem = puzzle.words.find((w) => found[w.word] == null);
    if (!rem || over) return;
    setHints((h) => h + 1);
    setFound((f) => ({ ...f, [rem.word]: Object.keys(f).length % PALETTE_N }));
  }

  function nextRound() {
    reported.current = false;
    startRef.current = null;
    selRef.current = null;
    setFound({});
    setHints(0);
    setSel(null);
    setDragging(false);
    setRound((r) => r + 1);
  }
  useEnterToAdvance(over, nextRound);

  // On Hard the word list is hidden — you hunt blind and words appear once found.
  const showList = difficulty < 3;
  const dirText =
    difficulty === 1
      ? 'across → and down ↓'
      : difficulty === 2
        ? 'across, down, and diagonally'
        : 'any direction — even backwards & upward';

  return (
    <div className="game wordsearch">
      <p className="hint">
        Find all {puzzle.words.length} {showList ? 'words' : 'hidden words — no list!'} — drag
        across the letters. They run {dirText}.
      </p>
      <div className="ws-wrap">
        <div className="ws-grid" style={{ ['--n' as string]: puzzle.size }}>
          {puzzle.grid.map((ch, idx) => {
            const r = Math.floor(idx / puzzle.size);
            const c = idx % puzzle.size;
            const key = r + ',' + c;
            const fc = foundCells.get(key);
            return (
              <div
                key={idx}
                data-r={r}
                data-c={c}
                className={`ws-cell${selSet.has(key) ? ' sel' : ''}${fc != null ? ' found ws-f' + fc : ''}`}
                onPointerDown={(e) => down(r, c, e)}
              >
                {ch}
              </div>
            );
          })}
        </div>
        <div className="ws-side">
          <ul className="ws-words">
            {puzzle.words.map((w) => {
              const got = found[w.word] != null;
              const masked = !showList && !got; // Hard: hide unfound words behind dots.
              return (
                <li key={w.word} className={`${got ? 'got' : ''}${masked ? ' masked' : ''}`}>
                  {masked ? '•'.repeat(w.word.length) : w.word}
                </li>
              );
            })}
          </ul>
          <p className="ws-count">{foundCount} / {puzzle.words.length} found</p>
          {!over && (
            <button className="joker" onClick={revealHint} disabled={foundCount >= puzzle.words.length}>
              💡 Reveal a word <small>−{HINT_COST}</small>
            </button>
          )}
        </div>
      </div>

      {over && (
        <div className="round-end">
          <p className="result win">
            All {puzzle.words.length} found! 🎉{hints > 0 ? ` (−${hints * HINT_COST} for ${hints} hint${hints > 1 ? 's' : ''})` : ''}
          </p>
          <div className="actions">
            <button className="primary big" onClick={nextRound}>▶ New puzzle</button>
          </div>
        </div>
      )}
    </div>
  );
}
