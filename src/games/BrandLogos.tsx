// "Guess the brand from its logo" — Flagle-style. The logo (rendered in the brand's
// real color) starts blurred and sharpens with each guess. Wrong guesses unlock
// category → first-letter hints.
import { useState } from 'react';
import { type Brand, type Difficulty, BRANDS, suggestBrands } from '../data';
import { roundScore } from '../scoring';
import { useAutoFocus, useEnterToAdvance, useRoundPick } from '../ui';

const MAX = 6;

function BrandMark({ brand, size = 200, mono = false }: { brand: Brand; size?: number; mono?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Brand logo">
      <path d={brand.path} fill={mono ? '#9fb3d1' : brand.hex} />
    </svg>
  );
}

function BrandInput({ onGuess, exclude }: { onGuess: (b: Brand) => void; exclude: Set<string> }) {
  const [text, setText] = useState('');
  const [active, setActive] = useState(0);
  const sugg = suggestBrands(text, exclude);
  function submit(b?: Brand) {
    const chosen = b ?? sugg[active];
    if (!chosen) return;
    onGuess(chosen); setText(''); setActive(0);
  }
  return (
    <div className="guess-input">
      <input value={text} placeholder="Name the brand…" autoComplete="off" spellCheck={false}
        onChange={(e) => { setText(e.target.value); setActive(0); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          else if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, sugg.length - 1));
          else if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0));
        }} />
      <button className="primary" onClick={() => submit()}>Guess</button>
      {sugg.length > 0 && text && (
        <ul className="suggest">
          {sugg.map((b, i) => (
            <li key={b.slug} className={i === active ? 'on' : ''}
              onMouseDown={(e) => { e.preventDefault(); submit(b); }}>{b.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BrandLogos({
  difficulty,
  seed,
  onResult,
}: {
  difficulty: Difficulty;
  seed?: number;
  onResult: (win: boolean, points: number) => void;
}) {
  const [round, setRound] = useState(0);
  const answer = useRoundPick(BRANDS, round, { seed, key: (b) => b.slug });

  const [guesses, setGuesses] = useState<Brand[]>([]);
  const solved = guesses.some((g) => g.slug === answer.slug);
  const over = solved || guesses.length >= MAX;
  const used = new Set(guesses.map((g) => g.slug));
  const focusRef = useAutoFocus(answer.slug);

  const startBlur = difficulty === 1 ? 5 : difficulty === 2 ? 11 : 18;
  const blur = over ? 0 : Math.max(0, startBlur - guesses.length * (startBlur / MAX));

  const hints = [`Category: ${answer.cat}`, `Starts with “${answer.name[0]}”`];
  const hintStart = difficulty === 1 ? 1 : difficulty === 2 ? 2 : 3;
  const hintsShown = hints.slice(0, Math.max(0, guesses.length - hintStart + 1));

  function guess(b: Brand) {
    if (over || used.has(b.slug)) return;
    const next = [...guesses, b];
    setGuesses(next);
    if (b.slug === answer.slug) onResult(true, roundScore(true, next.length, MAX));
    else if (next.length >= MAX) onResult(false, 0);
  }
  const nextRound = () => { setGuesses([]); setRound((r) => r + 1); };
  useEnterToAdvance(over, nextRound);

  return (
    <div className="game brandlogos">
      <div className="logo-stage">
        <div className="brand-plate" style={{ filter: `blur(${blur}px)` }}>
          <BrandMark brand={answer} size={200} mono={!over && difficulty === 3} />
        </div>
      </div>

      {!over && (
        <div ref={focusRef}>
          <p className="hint center">{MAX - guesses.length} guesses left{difficulty === 3 ? ' · silhouette only!' : ''}</p>
          {hintsShown.length > 0 && (
            <div className="img-hints">{hintsShown.map((h) => <span key={h} className="img-hint">🏷️ {h}</span>)}</div>
          )}
          <BrandInput onGuess={guess} exclude={used} />
        </div>
      )}

      <div className="guesses">
        {[...guesses].reverse().map((g, i) => (
          <div key={i} className={`guess-row city-row ${g.slug === answer.slug ? 'right' : 'wrong'}`}>
            <span className="gname">{g.slug === answer.slug ? '✅' : '❌'} {g.name}</span>
            <span /><span />
          </div>
        ))}
      </div>

      {over && (
        <div className="round-end">
          <p className={solved ? 'result win' : 'result lose'}>
            {solved ? `Solved in ${guesses.length}! 🎉` : `It was ${answer.name}.`}
          </p>
          <div className="fact-card brand-card" style={{ borderColor: answer.hex, boxShadow: `0 0 36px -12px ${answer.hex}` }}>
            <div className="brand-card-head"><BrandMark brand={answer} size={96} /></div>
            <h2>{answer.name}</h2>
            <p className="hint">{answer.cat}</p>
          </div>
          <button className="primary big" onClick={nextRound}>▶ Next brand</button>
        </div>
      )}
    </div>
  );
}
