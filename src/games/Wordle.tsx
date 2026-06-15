// Classic Wordle — guess the hidden word in 6 tries. Green = right letter & spot,
// yellow = in the word elsewhere, gray = not in the word (with correct duplicate
// handling). Difficulty sets the word length: Easy 4, Medium 5, Hard 6.
import { useEffect, useMemo, useState } from 'react';
import { type Difficulty, WORDS } from '../data';
import { roundScore } from '../scoring';
import { useEnterToAdvance, useRoundPick } from '../ui';

type Mark = 'correct' | 'present' | 'absent';
const MAX_ROWS = 6;
const LEN_FOR: Record<Difficulty, number> = { 1: 4, 2: 5, 3: 6 };

/** Two-pass scoring with correct duplicate-letter handling. */
function score(guess: string, answer: string): Mark[] {
  const n = guess.length;
  const res: Mark[] = Array(n).fill('absent');
  const used = Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    if (guess[i] === answer[i]) { res[i] = 'correct'; used[i] = true; }
  }
  for (let i = 0; i < n; i++) {
    if (res[i] === 'correct') continue;
    for (let j = 0; j < n; j++) {
      if (!used[j] && answer[j] === guess[i]) { res[i] = 'present'; used[j] = true; break; }
    }
  }
  return res;
}

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

export function Wordle({
  difficulty,
  seed,
  onResult,
}: {
  difficulty: Difficulty;
  seed?: number;
  onResult: (win: boolean, points: number) => void;
}) {
  const len = LEN_FOR[difficulty];
  const [round, setRound] = useState(0);
  const [jokerHints, setJokerHints] = useState<string[]>([]);
  const [jokerPos, setJokerPos] = useState<number[]>([]);
  const JOKER_COST = 25;
  const allowed = useMemo(() => new Set(WORDS.allowed[len]), [len]);
  const answer = useRoundPick(WORDS.answers[len], round, { seed, salt: len, key: (w) => w });

  const [guesses, setGuesses] = useState<string[]>([]);
  const [cur, setCur] = useState('');
  const [shake, setShake] = useState(false);
  const [msg, setMsg] = useState('');
  const [hardMode, setHardMode] = useState(false);

  // Hard Mode constraints from revealed hints: greens lock a position, and any
  // green/yellow letter must reappear in later guesses.
  const constraints = useMemo(() => {
    const greens: Record<number, string> = {};
    const required = new Set<string>();
    for (const g of guesses) {
      const marks = score(g, answer);
      for (let i = 0; i < g.length; i++) {
        if (marks[i] === 'correct') { greens[i] = g[i]; required.add(g[i]); }
        else if (marks[i] === 'present') required.add(g[i]);
      }
    }
    return { greens, required };
  }, [guesses, answer]);

  const solved = guesses.includes(answer);
  const over = solved || guesses.length >= MAX_ROWS;

  // ---- Hint jokers (each costs JOKER_COST points off this round's score) ----
  const greenPos = new Set(Object.keys(constraints.greens).map(Number));
  const idxs = Array.from({ length: len }, (_, i) => i);
  // Joker A: reveal a letter at an unknown spot — only in the last 3 guesses.
  const revealableIdx = idxs.filter((i) => !greenPos.has(i) && !jokerPos.includes(i));
  const canRevealLetter = !over && guesses.length >= MAX_ROWS - 3 && revealableIdx.length > 0;
  // Joker B: tell where a known yellow letter actually goes.
  const placeableIdx = idxs.filter(
    (i) => constraints.required.has(answer[i]) && !greenPos.has(i) && !jokerPos.includes(i),
  );
  const canPlaceYellow = !over && placeableIdx.length > 0;

  function useReveal() {
    const i = revealableIdx[0];
    if (i == null) return;
    setJokerHints((h) => [...h, `Position ${i + 1} is “${answer[i].toUpperCase()}”`]);
    setJokerPos((p) => [...p, i]);
  }
  function usePlaceYellow() {
    const i = placeableIdx[0];
    if (i == null) return;
    setJokerHints((h) => [...h, `Your “${answer[i].toUpperCase()}” goes in spot ${i + 1}`]);
    setJokerPos((p) => [...p, i]);
  }

  // Per-letter best status for keyboard coloring.
  const keyState = useMemo(() => {
    const m: Record<string, Mark> = {};
    const rank: Record<Mark, number> = { absent: 0, present: 1, correct: 2 };
    for (const g of guesses) {
      const marks = score(g, answer);
      for (let i = 0; i < g.length; i++) {
        const c = g[i];
        if (!m[c] || rank[marks[i]] > rank[m[c]]) m[c] = marks[i];
      }
    }
    return m;
  }, [guesses, answer]);

  function flash(t: string) {
    setMsg(t);
    setShake(true);
    setTimeout(() => setShake(false), 450);
    setTimeout(() => setMsg(''), 1200);
  }

  const ordinal = (n: number) => n + (['th', 'st', 'nd', 'rd'][((n % 100) - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');

  function submit() {
    if (cur.length < len) return flash('Not enough letters');
    if (!allowed.has(cur)) return flash('Not in word list');
    if (hardMode && guesses.length) {
      for (const [pos, letter] of Object.entries(constraints.greens)) {
        if (cur[+pos] !== letter)
          return flash(`${ordinal(+pos + 1)} letter must be ${letter.toUpperCase()}`);
      }
      for (const letter of constraints.required) {
        if (!cur.includes(letter)) return flash(`Guess must use ${letter.toUpperCase()}`);
      }
    }
    const next = [...guesses, cur];
    setGuesses(next);
    setCur('');
    if (cur === answer)
      onResult(true, Math.max(0, roundScore(true, next.length, MAX_ROWS) - jokerHints.length * JOKER_COST));
    else if (next.length >= MAX_ROWS) onResult(false, 0);
  }

  function type(c: string) {
    if (over) return;
    if (cur.length < len) setCur((s) => s + c);
  }
  const back = () => setCur((s) => s.slice(0, -1));

  // Physical keyboard.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (over) return;
      if (e.key === 'Enter') submit();
      else if (e.key === 'Backspace') back();
      else if (/^[a-zA-Z]$/.test(e.key)) type(e.key.toLowerCase());
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function nextRound() {
    setGuesses([]);
    setCur('');
    setMsg('');
    setJokerHints([]);
    setJokerPos([]);
    setRound((r) => r + 1);
  }
  useEnterToAdvance(over, nextRound);

  function shareGrid() {
    const grid = guesses
      .map((g) => score(g, answer).map((m) => (m === 'correct' ? '🟩' : m === 'present' ? '🟨' : '⬛')).join(''))
      .join('\n');
    const sc = solved ? guesses.length : 'X';
    navigator.clipboard?.writeText(`🔤 Wordle (${len}) ${sc}/${MAX_ROWS}\n${grid}`);
  }

  // Build the 6 rows: past guesses (scored), the current input, then empties.
  const rows = [];
  for (let r = 0; r < MAX_ROWS; r++) {
    if (r < guesses.length) {
      const g = guesses[r];
      const marks = score(g, answer);
      rows.push(g.split('').map((c, i) => ({ c, mark: marks[i] as Mark | 'empty' })));
    } else if (r === guesses.length && !over) {
      rows.push(
        Array.from({ length: len }, (_, i) => ({ c: cur[i] ?? '', mark: 'empty' as const })),
      );
    } else {
      rows.push(Array.from({ length: len }, () => ({ c: '', mark: 'empty' as const })));
    }
  }
  const activeRow = guesses.length;

  return (
    <div className="game wordle">
      <div className="wordle-top">
        <p className="hint">Guess the {len}-letter word · {MAX_ROWS} tries</p>
        <button
          className={`hardmode-toggle ${hardMode ? 'on' : ''}`}
          onClick={() => setHardMode((h) => !h)}
          title="Revealed letters must be reused in later guesses"
        >
          Hard mode: {hardMode ? 'ON' : 'OFF'}
        </button>
      </div>
      <div className="wordle-board" style={{ ['--len' as string]: len }}>
        {rows.map((row, r) => (
          <div key={r} className={`w-row ${shake && r === activeRow ? 'shake' : ''}`}>
            {row.map((cell, i) => (
              <div
                key={i}
                className={`w-tile ${cell.mark} ${cell.c && cell.mark === 'empty' ? 'filled' : ''}`}
              >
                {cell.c}
              </div>
            ))}
          </div>
        ))}
      </div>

      {msg && <p className="w-msg">{msg}</p>}

      {!over && (
        <div className="jokers">
          <button className="joker" disabled={!canRevealLetter} onClick={useReveal}
            title="Only in the last 3 guesses">
            🃏 Reveal a letter <small>−{JOKER_COST}</small>
          </button>
          <button className="joker" disabled={!canPlaceYellow} onClick={usePlaceYellow}
            title="Tells you where one of your found letters goes">
            🃏 Place a letter <small>−{JOKER_COST}</small>
          </button>
        </div>
      )}
      {jokerHints.length > 0 && (
        <div className="img-hints">
          {jokerHints.map((h, i) => <span key={i} className="img-hint joker-hint">🃏 {h}</span>)}
        </div>
      )}

      {!over && (
        <div className="keyboard">
          {ROWS.map((row, ri) => (
            <div key={ri} className="k-row">
              {ri === 2 && <button className="key wide" onClick={submit}>Enter</button>}
              {row.split('').map((c) => (
                <button key={c} className={`key ${keyState[c] ?? ''}`} onClick={() => type(c)}>
                  {c}
                </button>
              ))}
              {ri === 2 && <button className="key wide" onClick={back}>⌫</button>}
            </div>
          ))}
        </div>
      )}

      {over && (
        <div className="round-end">
          <p className={solved ? 'result win' : 'result lose'}>
            {solved ? `Solved in ${guesses.length}! 🎉` : `The word was “${answer.toUpperCase()}”.`}
          </p>
          <div className="actions">
            <button className="primary big" onClick={nextRound}>▶ Next word</button>
            <button className="ghost" onClick={shareGrid}>📋 Copy result</button>
          </div>
        </div>
      )}
    </div>
  );
}
