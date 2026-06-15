// Capitals quiz — multiple choice, kid-friendly. "What's the capital of X?"
// Pick with the mouse or the number keys 1–4.
import { useEffect, useMemo, useState } from 'react';
import { type Difficulty, answerPool, type Country } from '../data';
import { mulberry32 } from '../random';
import { quizScore } from '../scoring';
import { Flag, useEnterToAdvance, useRoundPick } from '../ui';

function distractors(answer: Country, pool: Country[], rng: () => number): Country[] {
  // Prefer capitals from the same region for plausible wrong answers.
  const sameRegion = pool.filter(
    (c) => c.id !== answer.id && c.capital && c.region === answer.region,
  );
  const others = pool.filter((c) => c.id !== answer.id && c.capital);
  const bag = (sameRegion.length >= 3 ? sameRegion : others).slice();
  const out: Country[] = [];
  while (out.length < 3 && bag.length) {
    const i = Math.floor(rng() * bag.length);
    out.push(bag.splice(i, 1)[0]);
  }
  return out;
}

export function Capitals({
  difficulty,
  seed,
  onResult,
}: {
  difficulty: Difficulty;
  seed?: number;
  onResult: (win: boolean, points: number) => void;
}) {
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const pool = useMemo(
    () => answerPool(difficulty).filter((c) => c.capital),
    [difficulty],
  );
  const answer = useRoundPick(pool, round, { seed, salt: 7, key: (c) => c.id });
  const options = useMemo(() => {
    const rng = seed != null ? mulberry32(seed + round + 7) : Math.random;
    const opts = [answer, ...distractors(answer, pool, rng)];
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    return opts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer, pool, round, seed]);

  function choose(c: Country) {
    if (picked) return;
    setPicked(c.id);
    onResult(c.id === answer.id, quizScore(c.id === answer.id));
  }

  function next() {
    setPicked(null);
    setRound((r) => r + 1);
  }
  useEnterToAdvance(!!picked, next);

  // Number keys 1–4 select an answer.
  useEffect(() => {
    if (picked) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) {
        e.preventDefault();
        choose(options[n - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picked, options]);

  return (
    <div className="game capitals">
      <div className="prompt">
        <Flag cca2={answer.cca2} className="prompt-flag" />
        <h2>What is the capital of {answer.name}?</h2>
      </div>
      <div className="choices">
        {options.map((c, i) => {
          let cls = 'choice';
          if (picked) {
            if (c.id === answer.id) cls += ' correct';
            else if (c.id === picked) cls += ' wrong';
          }
          return (
            <button key={c.id} className={cls} disabled={!!picked} onClick={() => choose(c)}>
              <span className="choice-num">{i + 1}</span>
              {c.capital}
            </button>
          );
        })}
      </div>
      {!picked && <p className="hint center">Tap a tile or press 1–4</p>}
      {picked && (
        <div className="round-end">
          <p className={picked === answer.id ? 'result win' : 'result lose'}>
            {picked === answer.id
              ? 'Correct! 🎉'
              : `The capital of ${answer.name} is ${answer.capital}.`}
          </p>
          <button className="primary big" onClick={next}>
            ▶ Next
          </button>
        </div>
      )}
    </div>
  );
}
