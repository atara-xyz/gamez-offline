// Higher or Lower — does the next country have MORE or FEWER people? Streak game.
import { useMemo, useRef, useState } from 'react';
import { type Country, type Difficulty, answerPool } from '../data';
import { mulberry32, pick } from '../random';
import { Flag, useEnterToAdvance } from '../ui';

export function HigherLower({
  difficulty,
  seed,
  onResult,
}: {
  difficulty: Difficulty;
  seed?: number;
  onResult: (win: boolean, points: number) => void;
}) {
  const pool = useMemo(
    () => answerPool(difficulty).filter((c) => c.population > 0),
    [difficulty],
  );
  const rng = useRef(seed != null ? mulberry32(seed) : Math.random);
  const draw = () => pick(pool, rng.current);

  const [left, setLeft] = useState<Country>(draw);
  const [right, setRight] = useState<Country>(() => { let r = draw(); while (r.id === left.id) r = draw(); return r; });
  const [streak, setStreak] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [over, setOver] = useState(false);

  function guess(higher: boolean) {
    if (revealed) return;
    const correct = higher ? right.population >= left.population : right.population <= left.population;
    setRevealed(true);
    if (correct) {
      const s = streak + 1;
      setStreak(s);
      setTimeout(() => {
        setLeft(right);
        let r = draw(); while (r.id === right.id) r = draw();
        setRight(r);
        setRevealed(false);
      }, 850);
    } else {
      setOver(true);
      onResult(false, Math.min(100, streak * 12));
    }
  }

  function retry() {
    const a = draw(); let b = draw(); while (b.id === a.id) b = draw();
    setLeft(a); setRight(b); setStreak(0); setRevealed(false); setOver(false);
  }
  useEnterToAdvance(over, retry);

  const card = (c: Country, showVal: boolean) => (
    <div className="hl-card">
      <Flag cca2={c.cca2} className="hl-flag" />
      <div className="hl-name">{c.name}</div>
      {showVal ? (
        <div className="hl-val">{c.population.toLocaleString()}<small>people</small></div>
      ) : (
        <div className="hl-q">has<br /><strong>more or fewer?</strong></div>
      )}
    </div>
  );

  return (
    <div className="game higherlower">
      <p className="hint center">Streak: <strong className="count">{streak}</strong></p>
      <div className="hl-row">
        {card(left, true)}
        <div className="hl-vs">vs</div>
        {card(right, revealed)}
      </div>

      {!revealed && !over && (
        <div className="hl-buttons">
          <button className="primary big" onClick={() => guess(true)}>▲ More people</button>
          <button className="primary big" onClick={() => guess(false)}>▼ Fewer people</button>
        </div>
      )}

      {over && (
        <div className="round-end">
          <p className="result lose">Out! Final streak: {streak}.</p>
          <p className="hint">{right.name} has {right.population.toLocaleString()} people.</p>
          <button className="primary big" onClick={retry}>▶ Play again</button>
        </div>
      )}
    </div>
  );
}
