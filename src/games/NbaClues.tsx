// "Guess the NBA team from clues." Each wrong guess reveals another fact
// (conference → division → city → founded → championships → first letter).
import { type CSSProperties, useState } from 'react';
import { type Difficulty, type NbaTeam, NBA } from '../data';
import { roundScore } from '../scoring';
import { useEnterToAdvance, useAutoFocus, useRoundPick } from '../ui';
import { TeamGuessInput, TeamFactCard } from './NbaShared';

const MAX = 6;

export function NbaClues({
  difficulty,
  seed,
  onResult,
}: {
  difficulty: Difficulty;
  seed?: number;
  onResult: (win: boolean, points: number) => void;
}) {
  const [round, setRound] = useState(0);
  const answer = useRoundPick(NBA, round, { seed, salt: 5, key: (t) => t.id });

  const [guesses, setGuesses] = useState<NbaTeam[]>([]);
  const solved = guesses.some((g) => g.id === answer.id);
  const over = solved || guesses.length >= MAX;
  const used = new Set(guesses.map((g) => g.id));

  const clues = [
    `Plays in the ${answer.conf}ern Conference`,
    `Division: ${answer.div}`,
    `Home city: ${answer.city}`,
    `Joined / founded: ${answer.founded}`,
    answer.titles > 0 ? `Championships: ${answer.titles}` : 'Championships: none yet',
    `Nickname starts with “${answer.name[0]}”`,
  ];
  // Easy reveals 2 clues to start; medium 1; hard 0 (clues come per wrong guess).
  const startClues = difficulty === 1 ? 2 : difficulty === 2 ? 1 : 0;
  const shown = Math.min(clues.length, startClues + guesses.length);

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
      <div className="clue-list">
        {clues.slice(0, shown).map((c, i) => (
          <div key={i} className="clue-item">🏀 {c}</div>
        ))}
        {shown === 0 && <p className="hint center">Make a guess to reveal your first clue!</p>}
      </div>

      {!over && (
        <div ref={focusRef}>
          <p className="hint center">{MAX - guesses.length} guesses left</p>
          <TeamGuessInput onGuess={guess} exclude={used} />
        </div>
      )}

      <div className="guesses">
        {[...guesses].reverse().map((g, i) => (
          <div key={i} className={`guess-row city-row ${g.id === answer.id ? 'right' : 'wrong'}`}>
            <span className="gname">{g.id === answer.id ? '✅' : '❌'} {g.full}</span>
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
