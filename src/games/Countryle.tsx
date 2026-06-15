// Countryle — guess the mystery country; each guess gives attribute feedback
// (same region? which way? bigger/smaller population & area?).
import { useMemo, useState } from 'react';
import { type Country, type Difficulty, answerPool } from '../data';
import { directionArrow, distanceKm, formatKm } from '../geo';
import { CountryGuessInput, FactCard, Flag, useAutoFocus, useEnterToAdvance, useRoundPick } from '../ui';

const MAX = 6;

export function Countryle({
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
  const answer = useRoundPick(pool, round, { seed, key: (c) => c.id });

  const [guesses, setGuesses] = useState<Country[]>([]);
  const solved = guesses.some((g) => g.id === answer.id);
  const over = solved || guesses.length >= MAX;
  const focusRef = useAutoFocus(answer.id);

  function guess(c: Country) {
    if (over || guesses.some((g) => g.id === c.id)) return;
    const next = [...guesses, c];
    setGuesses(next);
    if (c.id === answer.id) onResult(true, Math.round((100 * (MAX - next.length + 1)) / MAX));
    else if (next.length >= MAX) onResult(false, 0);
  }
  function nextRound() { setGuesses([]); setRound((r) => r + 1); }
  useEnterToAdvance(over, nextRound);

  const cmp = (g: number, a: number) => (a === g ? '=' : a > g ? '↑' : '↓');

  return (
    <div className="game countryle">
      {!over && <p className="hint center">{MAX - guesses.length} guesses left · clues compare your guess to the answer</p>}
      {!over && (
        <div ref={focusRef}><CountryGuessInput onGuess={guess} /></div>
      )}

      <div className="ctyle-list">
        {[...guesses].reverse().map((g, i) => {
          const right = g.id === answer.id;
          const km = distanceKm(g, answer);
          return (
            <div key={i} className={`ctyle-row ${right ? 'right' : ''}`}>
              <span className="g-head"><Flag cca2={g.cca2} /> {g.name}</span>
              {right ? (
                <span className="chip ok">✓ correct!</span>
              ) : (
                <>
                  <span className={`chip ${g.region === answer.region ? 'ok' : ''}`}>
                    {g.region === answer.region ? '✓ ' + g.region : g.region + ' ✗'}
                  </span>
                  <span className="chip">{formatKm(km)} {directionArrow(g, answer)}</span>
                  <span className="chip">pop {cmp(g.population, answer.population)}</span>
                  <span className="chip">area {cmp(g.area ?? 0, answer.area ?? 0)}</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {over && (
        <div className="round-end">
          <p className={solved ? 'result win' : 'result lose'}>
            {solved ? `Solved in ${guesses.length}! 🎉` : `It was ${answer.name}.`}
          </p>
          <FactCard country={answer} />
          <button className="primary big" onClick={nextRound}>▶ Next country</button>
        </div>
      )}
    </div>
  );
}
