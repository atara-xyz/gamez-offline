// Generic image-guessing game powering Dogs, Cats, and Animals.
// You see photo(s) of the mystery breed/species and name it. Each wrong guess
// reveals another example photo (the sets are deep) plus a progressive hint.
// Difficulty controls how much help you start with.
import { useMemo, useState } from 'react';
import { type Difficulty, type QuizItem, type QuizSet, QUIZSETS } from '../data';
import { roundScore } from '../scoring';
import { useEnterToAdvance, useAutoFocus, useRoundPick } from '../ui';

const MAX_GUESSES = 6;

export function ImageGuess({
  setKey,
  difficulty,
  seed,
  onResult,
}: {
  setKey: string;
  difficulty: Difficulty;
  seed?: number;
  onResult: (win: boolean, points: number) => void;
}) {
  const set: QuizSet | undefined = QUIZSETS[setKey];
  const [round, setRound] = useState(0);
  // Pick the answer in the persistent wrapper (ImageRound remounts each round, so
  // its own state can't remember recent picks) — this avoids back-to-back repeats.
  const answer = useRoundPick(set?.items ?? [], round, { seed, key: (i) => i.slug });

  if (!set || set.items.length < 4) {
    return (
      <div className="game">
        <p className="hint center">
          This image pack isn’t installed yet. Run <code>npm run media</code> (needs
          internet once) to download the {set?.label ?? 'image'} set, then rebuild.
        </p>
      </div>
    );
  }
  return (
    <ImageRound
      key={setKey + round + difficulty}
      set={set}
      answer={answer}
      difficulty={difficulty}
      onResult={onResult}
      onNext={() => setRound((r) => r + 1)}
    />
  );
}

function ImageRound({
  set,
  answer,
  difficulty,
  onResult,
  onNext,
}: {
  set: QuizSet;
  answer: QuizItem;
  difficulty: Difficulty;
  onResult: (win: boolean, points: number) => void;
  onNext: () => void;
}) {
  const base = import.meta.env.BASE_URL;
  const [guesses, setGuesses] = useState<string[]>([]);
  const [text, setText] = useState('');
  const solved = guesses.includes(answer.name);
  const over = solved || guesses.length >= MAX_GUESSES;
  useEnterToAdvance(over, onNext);
  const focusRef = useAutoFocus(answer.slug);

  // How many example photos to show: more on easy, +1 per wrong guess.
  const baseImgs = difficulty === 1 ? 3 : difficulty === 2 ? 2 : 1;
  const shown = over
    ? answer.images.length
    : Math.min(answer.images.length, baseImgs + guesses.length);

  // Progressive hints from the item's facts. Easy reveals from guess 1, hard later.
  const hintKeys = answer.hintOrder?.filter((k) => answer.facts?.[k]) ?? [];
  const hintStart = difficulty === 1 ? 0 : difficulty === 2 ? 1 : 2;
  const hintsVisible = hintKeys.slice(0, Math.max(0, guesses.length - hintStart + 1));

  const suggestions = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    const starts = set.items.filter((i) => i.name.toLowerCase().startsWith(q));
    const contains = set.items.filter(
      (i) => !i.name.toLowerCase().startsWith(q) && i.name.toLowerCase().includes(q),
    );
    return [...starts, ...contains].slice(0, 6);
  }, [text, set]);

  function guess(name: string) {
    if (over || guesses.includes(name)) return;
    const next = [...guesses, name];
    setGuesses(next);
    setText('');
    if (name === answer.name) onResult(true, roundScore(true, next.length, MAX_GUESSES));
    else if (next.length >= MAX_GUESSES) onResult(false, 0);
  }

  const guessesLeft = MAX_GUESSES - guesses.length;

  return (
    <div className="game imageguess">
      <div className={`photo-stage count-${Math.min(shown, 4)}`}>
        {answer.images.slice(0, shown).map((src, i) => (
          <img key={i} src={base + src} alt="mystery" loading="eager" />
        ))}
      </div>

      {!over && (
        <div ref={focusRef}>
          <p className="hint">
            {guessesLeft} {guessesLeft === 1 ? 'guess' : 'guesses'} left
            {set.hard ? ' · Hard set — look closely!' : ''}
          </p>
          {hintsVisible.length > 0 && (
            <div className="img-hints">
              {hintsVisible.map((k) => (
                <span key={k} className="img-hint">
                  <b>{k}:</b> {answer.facts?.[k]}
                </span>
              ))}
            </div>
          )}
          <div className="guess-input">
            <input
              value={text}
              placeholder={`Name the ${set.label.replace(/s$/, '').toLowerCase()}…`}
              autoComplete="off"
              spellCheck={false}
              autoFocus
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && suggestions[0] && guess(suggestions[0].name)}
            />
            <button className="primary" onClick={() => suggestions[0] && guess(suggestions[0].name)}>
              Guess
            </button>
            {suggestions.length > 0 && (
              <ul className="suggest">
                {suggestions.map((i) => (
                  <li key={i.slug} onMouseDown={(e) => { e.preventDefault(); guess(i.name); }}>
                    {i.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="guesses">
        {[...guesses].reverse().map((g, i) => (
          <div key={i} className={`guess-row city-row ${g === answer.name ? 'right' : 'wrong'}`}>
            <span className="gname">{g === answer.name ? '✅' : '❌'} {g}</span>
            <span />
            <span />
          </div>
        ))}
      </div>

      {over && (
        <div className="round-end">
          <p className={solved ? 'result win' : 'result lose'}>
            {solved ? `Solved in ${guesses.length}! 🎉` : `It was the ${answer.name}.`}
          </p>
          <div className="img-factcard">
            <h2>{set.emoji} {answer.name}</h2>
            {answer.facts && (
              <dl>
                {Object.entries(answer.facts)
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                  ))}
              </dl>
            )}
            <div className="photo-strip">
              {answer.images.map((src, i) => (
                <img key={i} src={base + src} alt={answer.name} loading="lazy" />
              ))}
            </div>
          </div>
          <button className="primary big" onClick={onNext}>▶ Next</button>
        </div>
      )}
    </div>
  );
}
