// "Guess the NBA team from its logo" — Flagle-style. The logo starts blurred
// (more on harder difficulty) and sharpens with each guess. Wrong guesses unlock
// conference / division / city hints.
import { type CSSProperties, useState } from 'react';
import { type Difficulty, type NbaTeam, NBA } from '../data';
import { roundScore } from '../scoring';
import { useEnterToAdvance, useAutoFocus, useRoundPick } from '../ui';
import { TeamGuessInput, TeamLogo, TeamFactCard } from './NbaShared';

const MAX = 6;

export function NbaLogo({
  difficulty,
  seed,
  onResult,
}: {
  difficulty: Difficulty;
  seed?: number;
  onResult: (win: boolean, points: number) => void;
}) {
  const [round, setRound] = useState(0);
  const answer = useRoundPick(NBA, round, { seed, key: (t) => t.id });

  const [guesses, setGuesses] = useState<NbaTeam[]>([]);
  const solved = guesses.some((g) => g.id === answer.id);
  const over = solved || guesses.length >= MAX;
  const used = new Set(guesses.map((g) => g.id));

  const startBlur = difficulty === 1 ? 6 : difficulty === 2 ? 12 : 20;
  const blur = over ? 0 : Math.max(0, startBlur - guesses.length * (startBlur / MAX));

  const hints = [
    `Conference: ${answer.conf}`,
    `Division: ${answer.div}`,
    `City: ${answer.city}`,
  ];
  const hintStart = difficulty === 1 ? 1 : difficulty === 2 ? 2 : 3;
  const hintsShown = hints.slice(0, Math.max(0, guesses.length - hintStart + 1));

  function guess(t: NbaTeam) {
    if (over || used.has(t.id)) return;
    const next = [...guesses, t];
    setGuesses(next);
    if (t.id === answer.id) onResult(true, roundScore(true, next.length, MAX));
    else if (next.length >= MAX) onResult(false, 0);
  }
  const nextRound = () => { setGuesses([]); setRound((r) => r + 1); };
  useEnterToAdvance(over, nextRound);
  const focusRef = useAutoFocus(answer.id);

  const tint = { ['--tint']: answer.colors[0], ['--tint2']: answer.colors[1] } as CSSProperties;
  return (
    <div className={`game nba${over ? ' tinted' : ''}`} style={tint}>
      <div className="logo-stage">
        <div style={{ filter: `blur(${blur}px)` }}>
          <TeamLogo team={answer} className="guess-logo" />
        </div>
      </div>

      {!over && (
        <div ref={focusRef}>
          <p className="hint center">{MAX - guesses.length} guesses left</p>
          {hintsShown.length > 0 && (
            <div className="img-hints">
              {hintsShown.map((h) => <span key={h} className="img-hint">🏀 {h}</span>)}
            </div>
          )}
          <TeamGuessInput onGuess={guess} exclude={used} />
        </div>
      )}

      <div className="guesses">
        {[...guesses].reverse().map((g, i) => (
          <div key={i} className={`guess-row city-row ${g.id === answer.id ? 'right' : 'wrong'}`}>
            <span className="gname"><TeamLogo team={g} className="mini" /> {g.id === answer.id ? '✅' : '❌'} {g.full}</span>
            <span /><span />
          </div>
        ))}
      </div>

      {over && (
        <div className="round-end">
          <p className={solved ? 'result win' : 'result lose'}>
            {solved ? `Solved in ${guesses.length}! 🎉` : `It was the ${answer.full}.`}
          </p>
          <TeamFactCard team={answer} />
          <button className="primary big" onClick={nextRound}>▶ Next team</button>
        </div>
      )}
    </div>
  );
}
