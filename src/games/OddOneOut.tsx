// Odd One Out — four countries, three share a trait (region or landlocked), one
// doesn't. Tap the odd one (or press 1–4).
import { useEffect, useMemo, useState } from 'react';
import { type Country, type Difficulty, answerPool } from '../data';
import { mulberry32, pick } from '../random';
import { quizScore } from '../scoring';
import { Flag, useEnterToAdvance } from '../ui';

interface Puzzle { options: Country[]; oddId: string; why: string; }

function shuffle<T>(a: T[], rng: () => number) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

function makePuzzle(pool: Country[], rng: () => number): Puzzle {
  for (let t = 0; t < 60; t++) {
    if (rng() < 0.6) {
      // region trait
      const regions = [...new Set(pool.map((c) => c.region))];
      const R = pick(regions, rng);
      const inR = pool.filter((c) => c.region === R);
      const out = pool.filter((c) => c.region !== R);
      if (inR.length >= 3 && out.length) {
        const three = shuffle(inR, rng).slice(0, 3);
        const odd = pick(out, rng);
        return { options: shuffle([...three, odd], rng), oddId: odd.id, why: `Three are in ${R}; ${odd.name} is in ${odd.region}.` };
      }
    } else {
      // landlocked trait
      const land = pool.filter((c) => c.landlocked);
      const coast = pool.filter((c) => !c.landlocked);
      if (land.length >= 3 && coast.length) {
        const three = shuffle(land, rng).slice(0, 3);
        const odd = pick(coast, rng);
        return { options: shuffle([...three, odd], rng), oddId: odd.id, why: `Three are landlocked; ${odd.name} has a coastline.` };
      }
    }
  }
  // fallback: region
  const three = shuffle(pool, rng).slice(0, 3);
  const odd = pool.find((c) => c.region !== three[0].region) ?? pool[0];
  return { options: shuffle([...three, odd], rng), oddId: odd.id, why: `${odd.name} is the odd one out.` };
}

export function OddOneOut({
  difficulty,
  seed,
  onResult,
}: {
  difficulty: Difficulty;
  seed?: number;
  onResult: (win: boolean, points: number) => void;
}) {
  const pool = useMemo(() => answerPool(difficulty), [difficulty]);
  const [round, setRound] = useState(0);
  const puzzle = useMemo(() => {
    const rng = seed != null ? mulberry32(seed + round) : Math.random;
    return makePuzzle(pool, rng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, round, seed]);

  const [picked, setPicked] = useState<string | null>(null);
  function choose(id: string) {
    if (picked) return;
    setPicked(id);
    onResult(id === puzzle.oddId, quizScore(id === puzzle.oddId));
  }
  function next() { setPicked(null); setRound((r) => r + 1); }
  useEnterToAdvance(!!picked, next);

  useEffect(() => {
    if (picked) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= puzzle.options.length) { e.preventDefault(); choose(puzzle.options[n - 1].id); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, puzzle]);

  return (
    <div className="game oddoneout">
      <p className="hint center">Which is the <strong>odd one out</strong>? Tap a tile or press 1–4.</p>
      <div className="choices odd-choices">
        {puzzle.options.map((c, i) => {
          let cls = 'choice';
          if (picked) {
            if (c.id === puzzle.oddId) cls += ' correct';
            else if (c.id === picked) cls += ' wrong';
          }
          return (
            <button key={c.id} className={cls} disabled={!!picked} onClick={() => choose(c.id)}>
              <span className="choice-num">{i + 1}</span>
              <Flag cca2={c.cca2} /> {c.name}
            </button>
          );
        })}
      </div>
      {picked && (
        <div className="round-end">
          <p className={picked === puzzle.oddId ? 'result win' : 'result lose'}>
            {picked === puzzle.oddId ? 'Correct! 🎉' : 'Not quite.'}
          </p>
          <p className="hint">{puzzle.why}</p>
          <button className="primary big" onClick={next}>▶ Next</button>
        </div>
      )}
    </div>
  );
}
