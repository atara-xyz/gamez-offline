// Hangman — guess the hidden word letter by letter before you run out of lives.
import { useEffect, useState } from 'react';
import { type Difficulty, WORDS } from '../data';
import { useEnterToAdvance, useRoundPick } from '../ui';

const MAX_WRONG = 6;
const LEN_FOR: Record<Difficulty, number> = { 1: 4, 2: 5, 3: 6 };
const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

export function Hangman({
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
  const word = useRoundPick(WORDS.answers[len], round, { seed, salt: len, key: (w) => w });

  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const wrong = [...guessed].filter((c) => !word.includes(c));
  const lives = MAX_WRONG - wrong.length;
  const solved = [...word].every((c) => guessed.has(c));
  const dead = lives <= 0;
  const over = solved || dead;

  function letter(c: string) {
    if (over || guessed.has(c)) return;
    const ng = new Set(guessed); ng.add(c);
    setGuessed(ng);
    const w = [...word].filter((x) => !ng.has(x)).length === 0;
    const wrongCount = [...ng].filter((x) => !word.includes(x)).length;
    if (w) onResult(true, Math.round((100 * (MAX_WRONG - wrongCount)) / MAX_WRONG) || 10);
    else if (wrongCount >= MAX_WRONG) onResult(false, 0);
  }
  function nextRound() { setGuessed(new Set()); setRound((r) => r + 1); }
  useEnterToAdvance(over, nextRound);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (!over && /^[a-zA-Z]$/.test(e.key)) letter(e.key.toLowerCase()); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="game hangman">
      <div className="hm-lives">
        {Array.from({ length: MAX_WRONG }, (_, i) => (
          <span key={i} className={i < lives ? 'heart' : 'heart gone'}>{i < lives ? '❤️' : '🖤'}</span>
        ))}
      </div>

      <div className="hm-word">
        {[...word].map((c, i) => (
          <span key={i} className={`hm-slot ${over && !guessed.has(c) ? 'miss' : ''}`}>
            {guessed.has(c) || over ? c : ''}
          </span>
        ))}
      </div>

      {wrong.length > 0 && !over && <p className="hint center">Misses: {wrong.join(' ').toUpperCase()}</p>}

      {!over && (
        <div className="keyboard hm-keys">
          {ROWS.map((row, r) => (
            <div key={r} className="k-row">
              {row.split('').map((c) => {
                const used = guessed.has(c);
                const hit = used && word.includes(c);
                return (
                  <button key={c} className={`key ${used ? (hit ? 'correct' : 'absent') : ''}`} disabled={used} onClick={() => letter(c)}>
                    {c}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {over && (
        <div className="round-end">
          <p className={solved ? 'result win' : 'result lose'}>
            {solved ? `Solved with ${lives} ${lives === 1 ? 'life' : 'lives'} left! 🎉` : `Out of lives — it was “${word.toUpperCase()}”.`}
          </p>
          <button className="primary big" onClick={nextRound}>▶ Next word</button>
        </div>
      )}
    </div>
  );
}
