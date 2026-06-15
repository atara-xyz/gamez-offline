// Math Drill — answer as many arithmetic problems as you can in 60 seconds.
// Difficulty: Easy +/−, Medium adds ×tables, Hard adds ÷ and bigger numbers.
import { useEffect, useRef, useState } from 'react';
import type { Difficulty } from '../data';

const TIME = 60;
type Problem = { text: string; answer: number };

function gen(difficulty: Difficulty): Problem {
  const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const ops = difficulty === 1 ? ['+', '-'] : difficulty === 2 ? ['+', '-', '×'] : ['+', '-', '×', '÷'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  if (op === '×') { const a = ri(2, 12), b = ri(2, 12); return { text: `${a} × ${b}`, answer: a * b }; }
  if (op === '÷') { const b = ri(2, 12), q = ri(2, 12); return { text: `${b * q} ÷ ${b}`, answer: q }; }
  const hi = difficulty === 1 ? 20 : difficulty === 2 ? 50 : 100;
  let a = ri(1, hi), b = ri(1, hi);
  if (op === '-' && b > a) [a, b] = [b, a];
  return { text: `${a} ${op} ${b}`, answer: op === '+' ? a + b : a - b };
}

export function MathDrill({
  difficulty,
  onResult,
}: {
  difficulty: Difficulty;
  onResult: (win: boolean, points: number) => void;
}) {
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready');
  const [problem, setProblem] = useState<Problem>(() => gen(difficulty));
  const [text, setText] = useState('');
  const [correct, setCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [flash, setFlash] = useState<'' | 'ok' | 'no'>('');
  const [timeLeft, setTimeLeft] = useState(TIME);
  const [best, setBest] = useState(() => Number(localStorage.getItem('math-best') || 0));
  const inputRef = useRef<HTMLInputElement>(null);
  const finishedRef = useRef(false);

  function start() {
    setPhase('playing'); setCorrect(0); setAttempts(0); setTimeLeft(TIME);
    setProblem(gen(difficulty)); setText(''); finishedRef.current = false;
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) {
      if (!finishedRef.current) {
        finishedRef.current = true;
        setPhase('done');
        onResult(true, Math.min(100, correct * 7));
        if (correct > best) { localStorage.setItem('math-best', String(correct)); setBest(correct); }
      }
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, timeLeft, correct, best, onResult]);

  function submit() {
    if (phase !== 'playing' || text.trim() === '') return;
    const ok = Number(text) === problem.answer;
    setAttempts((a) => a + 1);
    if (ok) { setCorrect((c) => c + 1); setFlash('ok'); } else setFlash('no');
    setTimeout(() => setFlash(''), 250);
    setProblem(gen(difficulty));
    setText('');
  }

  if (phase !== 'playing') {
    return (
      <div className="game mathdrill">
        <div className="md-card">
          <div className="dash-big">➗ Math Drill</div>
          {phase === 'done' ? (
            <>
              <div className="dash-score">{correct} correct{correct >= best && correct > 0 ? ' · NEW BEST!' : ''}</div>
              <div className="dash-best">in 60s · {attempts} attempted · best {best}</div>
            </>
          ) : (
            <div className="dash-best">Answer as many as you can in 60 seconds · best {best}</div>
          )}
          <button className="primary big" onClick={start}>▶ {phase === 'done' ? 'Play again' : 'Start'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="game mathdrill">
      <div className="md-top">
        <span className="md-time">⏱ {timeLeft}s</span>
        <span className="md-score">✓ {correct}</span>
      </div>
      <div className={`md-problem ${flash}`}>{problem.text} = ?</div>
      <div className="guess-input md-input">
        <input
          ref={inputRef}
          value={text}
          inputMode="numeric"
          autoComplete="off"
          onChange={(e) => setText(e.target.value.replace(/[^0-9-]/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button className="primary" onClick={submit}>Enter</button>
      </div>
    </div>
  );
}
