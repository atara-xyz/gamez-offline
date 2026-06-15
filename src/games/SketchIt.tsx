// Sketch It — a "drawing Wordle". You're told "Draw a ___"; you draw on the canvas;
// an offline algorithm grades how well your strokes match the target doodle
// (normalized so position/size don't matter). Difficulty controls the on-screen
// guide. Streak + best saved per device.
import { useEffect, useRef, useState } from 'react';
import type { Difficulty } from '../data';
import { useEnterToAdvance, useRoundPick } from '../ui';
import { DOODLES, scoreDrawing, type Doodle } from './doodles';

const SIZE = 320; // canvas px (square); drawing coords map to a 0..100 box
const toBox = (v: number) => (v / SIZE) * 100;

type Pt = { x: number; y: number };

export function SketchIt({
  difficulty,
  seed,
  onResult,
}: {
  difficulty: Difficulty;
  seed?: number;
  onResult: (win: boolean, points: number) => void;
}) {
  const [round, setRound] = useState(0);
  const target: Doodle = useRoundPick(DOODLES, round, { seed, key: (d) => d.name });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Pt[][]>([]);
  const drawing = useRef(false);
  const [, force] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [best, setBest] = useState(() => Number(localStorage.getItem('sketch-best') || 0));
  const [streak, setStreak] = useState(0);

  // Easy: faint full guide. Medium: just dots at stroke starts. Hard: nothing.
  const guide = difficulty === 1 ? 'full' : difficulty === 2 ? 'dots' : 'none';

  function redraw() {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    // paper grid
    ctx.fillStyle = '#0a1424'; ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.strokeStyle = '#132142'; ctx.lineWidth = 1;
    for (let i = 32; i < SIZE; i += 32) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, SIZE); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(SIZE, i); ctx.stroke(); }

    const sx = (v: number) => (v / 100) * SIZE;
    // guide (before grading)
    if (score == null && guide !== 'none') {
      if (guide === 'full') {
        ctx.strokeStyle = '#274060'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
        for (const s of target.strokes) {
          ctx.beginPath(); s.forEach(([x, y], i) => (i ? ctx.lineTo(sx(x), sx(y)) : ctx.moveTo(sx(x), sx(y)))); ctx.stroke();
        }
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = '#3a5078';
        for (const s of target.strokes) { const [x, y] = s[0]; ctx.beginPath(); ctx.arc(sx(x), sx(y), 4, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    // answer overlay (after grading)
    if (score != null) {
      ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 3; ctx.globalAlpha = 0.8;
      for (const s of target.strokes) { ctx.beginPath(); s.forEach(([x, y], i) => (i ? ctx.lineTo(sx(x), sx(y)) : ctx.moveTo(sx(x), sx(y)))); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    // user ink
    ctx.strokeStyle = score == null ? '#22d3ee' : '#7dd3fc';
    ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const s of strokes.current) {
      if (s.length < 2) { if (s.length === 1) { ctx.beginPath(); ctx.arc((s[0].x / 100) * SIZE, (s[0].y / 100) * SIZE, 2, 0, Math.PI * 2); ctx.fillStyle = '#22d3ee'; ctx.fill(); } continue; }
      ctx.beginPath(); s.forEach((p, i) => (i ? ctx.lineTo((p.x / 100) * SIZE, (p.y / 100) * SIZE) : ctx.moveTo((p.x / 100) * SIZE, (p.y / 100) * SIZE))); ctx.stroke();
    }
  }
  useEffect(redraw);

  function ptFrom(e: React.PointerEvent) {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: toBox(((e.clientX - r.left) / r.width) * SIZE), y: toBox(((e.clientY - r.top) / r.height) * SIZE) };
  }
  function down(e: React.PointerEvent) {
    if (score != null) return;
    e.preventDefault();
    drawing.current = true;
    strokes.current.push([ptFrom(e)]);
    force((n) => n + 1);
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current || score != null) return;
    strokes.current[strokes.current.length - 1].push(ptFrom(e));
    redraw();
  }
  function up() { drawing.current = false; }

  function clear() { strokes.current = []; setScore(null); force((n) => n + 1); }
  function done() {
    const sc = scoreDrawing(strokes.current, target);
    setScore(sc);
    const win = sc >= 60;
    setStreak((s) => (win ? s + 1 : 0));
    onResult(win, sc);
    if (sc > best) { localStorage.setItem('sketch-best', String(sc)); setBest(sc); }
  }
  function next() { strokes.current = []; setScore(null); setRound((r) => r + 1); }
  useEnterToAdvance(score != null, next);

  const hasInk = strokes.current.some((s) => s.length > 1);
  // Rate the "X-ness" of the artwork, e.g. "82% bicycle!"
  const nessName = target.name.toLowerCase();
  const verdict = score == null ? ''
    : score >= 85 ? `${score}% ${nessName} — masterpiece! 🌟`
    : score >= 70 ? `${score}% ${nessName} — great! ✨`
    : score >= 60 ? `${score}% ${nessName} — recognizable! 👍`
    : `only ${score}% ${nessName}… try again 🤔`;

  return (
    <div className="game sketchit">
      <div className="sk-prompt">
        Draw a <strong>{target.name}</strong> {target.emoji}
        <span className="sk-streak">streak {streak} · best {best}</span>
      </div>

      <canvas
        ref={canvasRef} width={SIZE} height={SIZE} className="sk-canvas"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
      />

      {score == null ? (
        <div className="sk-actions">
          <button className="ghost" onClick={clear} disabled={!hasInk}>✕ Clear</button>
          <button className="primary big" onClick={done} disabled={!hasInk}>✓ Done</button>
          <span className="hint small">{guide === 'full' ? 'trace the dotted guide' : guide === 'dots' ? 'dots show where strokes start' : 'no guide — freehand!'}</span>
        </div>
      ) : (
        <div className="round-end">
          <p className={score >= 60 ? 'result win' : 'result lose'}>{verdict}</p>
          <p className="hint">Green is the target shape — how close did you get?</p>
          <div className="actions">
            <button className="ghost" onClick={() => { setScore(null); force((n) => n + 1); }}>↺ Retry this one</button>
            <button className="primary big" onClick={next}>▶ Next drawing</button>
          </div>
        </div>
      )}
    </div>
  );
}
