// Shared shell for the three "guess the country" games. The only difference
// between Globle / Worldle / Flagle is the clue shown and a few options.
// Hints scale with difficulty:
//   Easy   = map + compass direction + proximity
//   Medium = map + proximity, no direction
//   Hard   = silhouette/flag only — no map, no direction, no proximity (all bets off)
import { useMemo, useState } from 'react';
import {
  type Country,
  type Difficulty,
  answerPool,
  silhouettePool,
} from '../data';
import { distanceKm, proximitySquare } from '../geo';
import { roundScore, globeScore } from '../scoring';
import { CountryGuessInput, FactCard, GuessList, type Guess, useAutoFocus, useEnterToAdvance, useRoundPick } from '../ui';
import { WorldMap } from './WorldMap';
import { Silhouette } from './Silhouette';
import { FlagReveal } from './FlagReveal';

export type Mode = 'globle' | 'worldle' | 'flagle';

const CONFIG: Record<Mode, { title: string; emoji: string; maxGuesses: number }> = {
  globle: { title: 'Globle', emoji: '🌍', maxGuesses: 99 },
  worldle: { title: 'Worldle', emoji: '🗺️', maxGuesses: 6 },
  flagle: { title: 'Flagle', emoji: '🚩', maxGuesses: 6 },
};

function hintsFor(mode: Mode, difficulty: Difficulty) {
  return {
    // Globle is a map game so it always shows the map.
    map: mode === 'globle' ? true : mode === 'worldle' && difficulty <= 2,
    direction: difficulty === 1,
    proximity: difficulty <= 2,
  };
}

export function CountryGuessGame({
  mode,
  difficulty,
  seed,
  onResult,
  onExploreCities,
}: {
  mode: Mode;
  difficulty: Difficulty;
  seed?: number;
  onResult: (win: boolean, points: number) => void;
  onExploreCities: (c: Country) => void;
}) {
  const cfg = CONFIG[mode];
  const hints = hintsFor(mode, difficulty);
  const [round, setRound] = useState(0);

  const pool = useMemo(
    () => (mode === 'worldle' ? silhouettePool(difficulty) : answerPool(difficulty)),
    [mode, difficulty],
  );
  const answer = useRoundPick(pool, round, { seed, key: (c) => c.id });

  const [guesses, setGuesses] = useState<Guess[]>([]);
  const focusRef = useAutoFocus(answer.id);

  const solved = guesses.some((g) => g.solved);
  const lost = !solved && guesses.length >= cfg.maxGuesses;
  const over = solved || lost;

  function guess(c: Country) {
    if (over || guesses.some((g) => g.country.id === c.id)) return;
    const km = distanceKm(c, answer);
    const win = c.id === answer.id;
    const next = [...guesses, { country: c, km, solved: win }];
    setGuesses(next);
    if (win) onResult(true, mode === 'globle' ? globeScore(true, next.length) : roundScore(true, next.length, cfg.maxGuesses));
    else if (next.length >= cfg.maxGuesses) onResult(false, 0);
  }

  function nextRound() {
    setGuesses([]);
    setRound((r) => r + 1);
  }
  useEnterToAdvance(over, nextRound);

  function shareGrid() {
    const grid = guesses.map((g) => proximitySquare(g.km, g.solved)).join('');
    const score = solved ? `${guesses.length}` : 'X';
    const text = `${cfg.emoji} ${cfg.title} — ${answer.name}\n${grid} (${score}${
      cfg.maxGuesses < 99 ? '/' + cfg.maxGuesses : ''
    })`;
    navigator.clipboard?.writeText(text);
  }

  const guessesLeft = cfg.maxGuesses - guesses.length;
  const guessedCountries = guesses.map((g) => g.country);

  return (
    <div className="game">
      <div className="clue">
        {mode === 'globle' && (
          <WorldMap answer={answer} guessed={guessedCountries} reveal={over} />
        )}
        {mode === 'worldle' && <Silhouette country={answer} />}
        {mode === 'flagle' && (
          <FlagReveal
            country={answer}
            guessCount={guesses.length}
            reveal={over}
            difficulty={difficulty}
          />
        )}
      </div>

      {!over && (
        <>
          {cfg.maxGuesses < 99 && (
            <p className="hint">
              {guessesLeft} {guessesLeft === 1 ? 'guess' : 'guesses'} left ·{' '}
              {difficulty === 3 ? 'Hard — no help!' : difficulty === 2 ? 'Medium' : 'Easy'}
            </p>
          )}
          {mode === 'globle' && (
            <p className="hint">Closer guesses glow hotter on the map.</p>
          )}
          <div ref={focusRef}>
            <CountryGuessInput onGuess={guess} hideFlags={mode === 'flagle'} />
          </div>
        </>
      )}

      {/* Worldle map hint: where your guesses landed (easy/medium only). */}
      {mode === 'worldle' && hints.map && guesses.length > 0 && (
        <div className="mini-map">
          <p className="hint small">Your guesses on the map:</p>
          <WorldMap answer={answer} guessed={guessedCountries} reveal={over} />
        </div>
      )}

      <GuessList
        guesses={[...guesses].reverse()}
        target={answer}
        showDirection={hints.direction}
        showProximity={hints.proximity}
        hideFlags={mode === 'flagle'}
      />

      {over && (
        <div className="round-end">
          <p className={solved ? 'result win' : 'result lose'}>
            {solved
              ? `Solved in ${guesses.length}! 🎉`
              : `Out of guesses — it was ${answer.name}.`}
          </p>
          <FactCard country={answer} onExploreCities={onExploreCities} />
          <div className="actions">
            <button className="primary big" onClick={nextRound}>
              ▶ Next country
            </button>
            <button className="ghost" onClick={shareGrid}>
              📋 Copy result
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
