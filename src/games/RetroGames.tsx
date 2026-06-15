// Retro Games — a C64/Atari "Summer/Winter/California Games" homage, canvas-rendered
// with animated athletes and themed backdrops. Events:
//   Summer  ☀️  100m Sprint (mash ←/→) · Hurdles (mash + jump)
//   Winter  ❄️  Ski Slalom (steer through gates) · Ski Jump (timing power+lean)
//   Calif.  🏄  Halfpipe (pump + spin tricks)
// Each event keeps its own best in localStorage.
import { useEffect, useRef, useState } from 'react';

const CW = 720, CH = 360;

type EventId = 'sprint' | 'hurdles' | 'slalom' | 'skijump' | 'halfpipe';
const EVENTS: { id: EventId; emoji: string; name: string; theme: string; blurb: string }[] = [
  { id: 'sprint', emoji: '🏃', name: '100m Sprint', theme: 'Summer', blurb: 'Mash ← → alternately to sprint!' },
  { id: 'hurdles', emoji: '🚧', name: 'Hurdles', theme: 'Summer', blurb: 'Mash to run, Space to leap hurdles.' },
  { id: 'slalom', emoji: '🎿', name: 'Ski Slalom', theme: 'Winter', blurb: 'Steer ← → through the gates.' },
  { id: 'skijump', emoji: '⛷️', name: 'Ski Jump', theme: 'Winter', blurb: 'Time your launch and lean.' },
  { id: 'halfpipe', emoji: '🛹', name: 'Halfpipe', theme: 'California', blurb: 'Pump the walls, spin for points.' },
];
const THEMES = ['Summer', 'Winter', 'California'];

function useBest(key: string) {
  const [best, setBest] = useState(() => Number(localStorage.getItem(key) || 0));
  const save = (v: number) => { if (v > best) { localStorage.setItem(key, String(v)); setBest(v); } };
  return [best, save] as const;
}

export function RetroGames() {
  const [ev, setEv] = useState<EventId | null>(null);
  if (ev) {
    const Cmp = { sprint: Sprint, hurdles: Hurdles, slalom: Slalom, skijump: SkiJump, halfpipe: Halfpipe }[ev];
    return <Cmp onExit={() => setEv(null)} />;
  }
  return (
    <div className="game retro">
      <div className="dash-big">🕹️ Retro Games</div>
      <p className="hint center">A throwback sports meet — pick an event:</p>
      {THEMES.map((t) => (
        <div key={t} className="retro-theme">
          <h3 className="cat-title">{t === 'Summer' ? '☀️ Summer' : t === 'Winter' ? '❄️ Winter' : '🏄 California'} Games</h3>
          <div className="retro-events">
            {EVENTS.filter((e) => e.theme === t).map((e) => (
              <button key={e.id} className="game-tile" onClick={() => setEv(e.id)}>
                <span className="tile-emoji">{e.emoji}</span>
                <span className="tile-title">{e.name}</span>
                <span className="tile-blurb">{e.blurb}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Shared shell: canvas + heading + exit.
function Stage({ title, best, onExit, children, canvasRef }: {
  title: string; best: number; onExit: () => void; children?: React.ReactNode;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}) {
  return (
    <div className="game retro-event">
      <div className="retro-head"><button className="ghost" onClick={onExit}>← Events</button><h3>{title}</h3><span className="retro-best">Best {best}</span></div>
      <canvas ref={canvasRef} width={CW} height={CH} className="retro-canvas" />
      {children}
    </div>
  );
}

// ---- drawing helpers ----
function crowd(ctx: CanvasRenderingContext2D, y: number, scroll: number) {
  for (let i = 0; i < 60; i++) {
    const x = ((i * 24 - scroll * 0.3) % (CW + 40)) - 20;
    ctx.fillStyle = ['#3a4a6a', '#4a3a5a', '#2a4a4a', '#5a4a3a'][i % 4];
    ctx.fillRect(x, y - (i % 3) * 2, 14, 12);
  }
}
function runner(ctx: CanvasRenderingContext2D, x: number, y: number, phase: number, color: string, lean = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(lean);
  ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.lineCap = 'round';
  // body
  ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(0, -10); ctx.stroke();
  // head
  ctx.fillStyle = '#e9bd96'; ctx.beginPath(); ctx.arc(0, -34, 6, 0, Math.PI * 2); ctx.fill();
  const a = Math.sin(phase) * 0.9;
  // legs
  ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(Math.sin(a) * 12, 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(-Math.sin(a) * 12, 4); ctx.stroke();
  // arms
  ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(-Math.sin(a) * 10, -14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(Math.sin(a) * 10, -14); ctx.stroke();
  ctx.restore();
}

// ============ SUMMER: 100m Sprint ============
function Sprint({ onExit }: { onExit: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [best, saveBest] = useBest('retro-sprint');
  const [phase, setPhase] = useState<'ready' | 'run' | 'done'>('ready');
  const g = useRef({ dist: 0, speed: 0, last: '' as 'L' | 'R' | '', t0: 0, legs: 0, time: 0 });

  useEffect(() => {
    const ctx = ref.current!.getContext('2d')!; let raf = 0;
    const loop = (t: number) => {
      const s = g.current;
      if (phase === 'run') {
        s.speed = Math.max(0, s.speed - 0.012);
        s.dist = Math.min(100, s.dist + s.speed);
        s.legs += s.speed * 0.5;
        s.time = (t - s.t0) / 1000;
        if (s.dist >= 100 && phase === 'run') { const sc = Math.max(1, Math.round(130 - s.time * 6)); saveBest(sc); setPhase('done'); }
      }
      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, CH); sky.addColorStop(0, '#5ec5ff'); sky.addColorStop(1, '#bfe9ff');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = '#fff7c2'; ctx.beginPath(); ctx.arc(80, 60, 30, 0, Math.PI * 2); ctx.fill();
      crowd(ctx, 110, g.current.dist * 7);
      // track
      ctx.fillStyle = '#c0613a'; ctx.fillRect(0, 230, CW, 130);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([16, 16]);
      for (let l = 1; l < 4; l++) { ctx.beginPath(); ctx.moveTo(0, 230 + l * 32); ctx.lineTo(CW, 230 + l * 32); ctx.stroke(); }
      ctx.setLineDash([]);
      // distance markers scroll past
      ctx.fillStyle = '#fff';
      for (let m = 0; m <= 100; m += 10) { const x = CW * 0.2 + (m - g.current.dist) * 6.5; if (x > -20 && x < CW) { ctx.fillRect(x, 224, 2, 12); } }
      // finish
      const fx = CW * 0.2 + (100 - g.current.dist) * 6.5;
      if (fx < CW + 20) { for (let r = 0; r < 8; r++) for (let c = 0; c < 2; c++) { ctx.fillStyle = (r + c) % 2 ? '#fff' : '#111'; ctx.fillRect(fx + c * 8, 210 + r * 14, 8, 14); } }
      runner(ctx, CW * 0.2, 250, g.current.legs, '#1d4ed8', Math.min(0.25, g.current.speed));
      ctx.fillStyle = '#03121e'; ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(`${g.current.dist.toFixed(0)} m`, 16, 32); ctx.textAlign = 'right'; ctx.fillText(`⏱ ${g.current.time.toFixed(2)}s`, CW - 16, 32);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, saveBest]);

  const tap = (side: 'L' | 'R') => { const s = g.current; if (phase !== 'run') return; if (s.last !== side) { s.speed = Math.min(0.95, s.speed + 0.07); s.last = side; } };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft') tap('L'); else if (e.key === 'ArrowRight') tap('R'); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });
  const begin = () => { g.current = { dist: 0, speed: 0, last: '', t0: performance.now(), legs: 0, time: 0 }; setPhase('run'); };

  return (
    <Stage title="🏃 100m Sprint" best={best} onExit={onExit} canvasRef={ref}>
      {phase === 'ready' && <button className="primary big" onClick={begin}>▶ Start — then mash ← →</button>}
      {phase === 'run' && <div className="retro-buttons"><button className="mash" onPointerDown={() => tap('L')}>◀ LEFT</button><button className="mash" onPointerDown={() => tap('R')}>RIGHT ▶</button></div>}
      {phase === 'done' && <div className="round-end"><p className="result win">Finished in {g.current.time.toFixed(2)}s! 🎉</p><button className="primary big" onClick={begin}>▶ Race again</button></div>}
    </Stage>
  );
}

// ============ SUMMER: Hurdles ============
function Hurdles({ onExit }: { onExit: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [best, saveBest] = useBest('retro-hurdles');
  const [phase, setPhase] = useState<'ready' | 'run' | 'done'>('ready');
  const g = useRef({ dist: 0, speed: 0, last: '' as 'L' | 'R' | '', legs: 0, py: 0, vy: 0, jumping: false, hurdles: [] as number[], time: 0, t0: 0, hit: 0 });

  useEffect(() => {
    const ctx = ref.current!.getContext('2d')!; let raf = 0;
    const loop = (t: number) => {
      const s = g.current;
      if (phase === 'run') {
        s.speed = Math.max(0, s.speed - 0.012);
        s.dist = Math.min(100, s.dist + s.speed);
        s.legs += s.speed * 0.5;
        s.time = (t - s.t0) / 1000;
        if (s.jumping) { s.vy += 1.1; s.py += s.vy; if (s.py >= 0) { s.py = 0; s.vy = 0; s.jumping = false; } }
        // hurdle collision: near a hurdle and not high enough
        for (const h of s.hurdles) { const dx = Math.abs(h - s.dist); if (dx < 1.2 && s.py > -22) { s.speed *= 0.5; s.hit++; } }
        if (s.dist >= 100) { const sc = Math.max(1, Math.round(130 - s.time * 6 - s.hit * 5)); saveBest(sc); setPhase('done'); }
      }
      const sky = ctx.createLinearGradient(0, 0, 0, CH); sky.addColorStop(0, '#5ec5ff'); sky.addColorStop(1, '#bfe9ff');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, CW, CH);
      crowd(ctx, 110, s.dist * 7);
      ctx.fillStyle = '#c0613a'; ctx.fillRect(0, 250, CW, 110);
      // hurdles
      for (const h of s.hurdles) { const x = CW * 0.2 + (h - s.dist) * 6.2; if (x > -20 && x < CW) { ctx.fillStyle = '#fff'; ctx.fillRect(x, 224, 4, 26); ctx.fillRect(x - 8, 224, 20, 4); } }
      runner(ctx, CW * 0.2, 250 + s.py, s.legs, '#16a34a', s.jumping ? -0.3 : Math.min(0.2, s.speed));
      ctx.fillStyle = '#03121e'; ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'left'; ctx.fillText(`${s.dist.toFixed(0)} m`, 16, 32);
      ctx.textAlign = 'right'; ctx.fillText(`⏱ ${s.time.toFixed(2)}s · hits ${s.hit}`, CW - 16, 32);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [phase, saveBest]);

  const tap = (side: 'L' | 'R') => { const s = g.current; if (phase !== 'run') return; if (s.last !== side) { s.speed = Math.min(0.95, s.speed + 0.07); s.last = side; } };
  const jump = () => { const s = g.current; if (phase === 'run' && !s.jumping) { s.jumping = true; s.vy = -16; } };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft') tap('L'); else if (e.key === 'ArrowRight') tap('R'); else if (e.key === ' ') { e.preventDefault(); jump(); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });
  const begin = () => { const hs = []; for (let d = 15; d < 100; d += 15) hs.push(d); g.current = { dist: 0, speed: 0, last: '', legs: 0, py: 0, vy: 0, jumping: false, hurdles: hs, time: 0, t0: performance.now(), hit: 0 }; setPhase('run'); };

  return (
    <Stage title="🚧 Hurdles" best={best} onExit={onExit} canvasRef={ref}>
      {phase === 'ready' && <button className="primary big" onClick={begin}>▶ Start — mash ← →, Space to jump</button>}
      {phase === 'run' && <div className="retro-buttons"><button className="mash" onPointerDown={() => tap('L')}>◀</button><button className="mash jump" onPointerDown={jump}>JUMP ⤴</button><button className="mash" onPointerDown={() => tap('R')}>▶</button></div>}
      {phase === 'done' && <div className="round-end"><p className="result win">Done in {g.current.time.toFixed(2)}s · {g.current.hit} hits</p><button className="primary big" onClick={begin}>▶ Again</button></div>}
    </Stage>
  );
}

// ============ WINTER: Ski Slalom ============
function Slalom({ onExit }: { onExit: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [best, saveBest] = useBest('retro-slalom');
  const [phase, setPhase] = useState<'ready' | 'run' | 'done'>('ready');
  const g = useRef({ y: 0, x: CW / 2, vx: 0, gates: [] as { y: number; cx: number; passed: boolean; missed: boolean }[], score: 0, left: false, right: false, done: 0 });

  useEffect(() => {
    const ctx = ref.current!.getContext('2d')!; let raf = 0;
    const loop = () => {
      const s = g.current;
      if (phase === 'run') {
        s.y += 4.2;
        s.vx += (s.right ? 0.6 : 0) - (s.left ? 0.6 : 0); s.vx *= 0.92;
        s.x = Math.max(20, Math.min(CW - 20, s.x + s.vx));
        for (const gt of s.gates) {
          const sy = gt.y - s.y + 80;
          if (!gt.passed && !gt.missed && sy < 250 && sy > 230) {
            if (Math.abs(s.x - gt.cx) < 46) { gt.passed = true; s.score += 10; } else { gt.missed = true; }
          }
        }
        if (s.y > (s.gates[s.gates.length - 1]?.y ?? 0) + 100) { saveBest(s.score); setPhase('done'); }
      }
      ctx.fillStyle = '#eaf4ff'; ctx.fillRect(0, 0, CW, CH);
      // trees + snow scroll
      for (let i = 0; i < 30; i++) { const ty = ((i * 80 - g.current.y) % (CH + 80)); const tx = (i * 137) % CW; ctx.fillStyle = '#2f6b3a'; ctx.beginPath(); ctx.moveTo(tx, ty + 18); ctx.lineTo(tx + 9, ty); ctx.lineTo(tx + 18, ty + 18); ctx.fill(); }
      ctx.fillStyle = '#bcd6ee'; for (let i = 0; i < 40; i++) { const fy = ((i * 53 - g.current.y * 1.4) % CH + CH) % CH; ctx.fillRect((i * 97) % CW, fy, 2, 2); }
      // gates
      for (const gt of g.current.gates) {
        const sy = gt.y - g.current.y + 80; if (sy < -20 || sy > CH) continue;
        const c = gt.missed ? '#aaa' : gt.passed ? '#22c55e' : (g.current.gates.indexOf(gt) % 2 ? '#1d4ed8' : '#dc2626');
        ctx.fillStyle = c; ctx.fillRect(gt.cx - 46, sy, 5, 22); ctx.fillRect(gt.cx + 41, sy, 5, 22);
      }
      // skier
      ctx.save(); ctx.translate(g.current.x, 240); ctx.rotate(g.current.vx * 0.05);
      ctx.fillStyle = '#e9bd96'; ctx.beginPath(); ctx.arc(0, -26, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, -2); ctx.stroke();
      ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-10, 6); ctx.lineTo(10, 6); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#03121e'; ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'left'; ctx.fillText(`Score ${g.current.score}`, 16, 32);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [phase, saveBest]);

  useEffect(() => {
    const d = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft') g.current.left = true; if (e.key === 'ArrowRight') g.current.right = true; };
    const u = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft') g.current.left = false; if (e.key === 'ArrowRight') g.current.right = false; };
    window.addEventListener('keydown', d); window.addEventListener('keyup', u);
    return () => { window.removeEventListener('keydown', d); window.removeEventListener('keyup', u); };
  });
  const begin = () => { const gates = []; for (let i = 1; i <= 12; i++) gates.push({ y: i * 130, cx: 120 + Math.abs(Math.sin(i * 1.7)) * (CW - 240), passed: false, missed: false }); g.current = { y: 0, x: CW / 2, vx: 0, gates, score: 0, left: false, right: false, done: 0 }; setPhase('run'); };

  return (
    <Stage title="🎿 Ski Slalom" best={best} onExit={onExit} canvasRef={ref}>
      {phase === 'ready' && <button className="primary big" onClick={begin}>▶ Start — steer ← →</button>}
      {phase === 'run' && <div className="retro-buttons"><button className="mash" onPointerDown={() => (g.current.left = true)} onPointerUp={() => (g.current.left = false)} onPointerLeave={() => (g.current.left = false)}>◀ LEFT</button><button className="mash" onPointerDown={() => (g.current.right = true)} onPointerUp={() => (g.current.right = false)} onPointerLeave={() => (g.current.right = false)}>RIGHT ▶</button></div>}
      {phase === 'done' && <div className="round-end"><p className="result win">{g.current.score} points! 🎉</p><button className="primary big" onClick={begin}>▶ Again</button></div>}
    </Stage>
  );
}

// ============ WINTER: Ski Jump ============
function SkiJump({ onExit }: { onExit: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [best, saveBest] = useBest('retro-skijump');
  const [stage, setStage] = useState<'ready' | 'power' | 'lean' | 'fly' | 'done'>('ready');
  const g = useRef({ bar: 0, dir: 1, power: 0, lean: 0.5, fx: 0, fy: 0, vx: 0, vy: 0, dist: 0 });

  useEffect(() => {
    const ctx = ref.current!.getContext('2d')!; let raf = 0;
    const loop = () => {
      const s = g.current;
      if (stage === 'power' || stage === 'lean') { s.bar += s.dir * 0.022; if (s.bar > 1) { s.bar = 1; s.dir = -1; } if (s.bar < 0) { s.bar = 0; s.dir = 1; } }
      if (stage === 'fly') {
        s.fx += s.vx; s.fy += s.vy; s.vy += 0.12 * (1 - s.lean * 0.5); s.vx *= 0.998;
        if (s.fy > 150) { s.dist = Math.round(40 + s.fx / 4); saveBest(s.dist); setStage('done'); }
      }
      // sky + slope
      const sky = ctx.createLinearGradient(0, 0, 0, CH); sky.addColorStop(0, '#9ec9f0'); sky.addColorStop(1, '#eaf4ff');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, 120); ctx.lineTo(220, 230); ctx.lineTo(260, 220); ctx.lineTo(0, 360); ctx.fill();
      ctx.fillStyle = '#dceaf6'; ctx.fillRect(0, 320, CW, 40);
      // skier
      let sx = 230, sy = 215, rot = -0.5;
      if (stage === 'fly') { sx = 230 + s.fx; sy = 215 + s.fy; rot = -0.4 + s.lean * 0.6 + s.vy * 0.02; }
      else if (stage === 'done') { sx = 230 + s.fx; sy = 320; rot = 0; }
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(rot);
      ctx.fillStyle = '#e9bd96'; ctx.beginPath(); ctx.arc(8, -8, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-8, 2); ctx.lineTo(8, -6); ctx.stroke();
      ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, 6); ctx.lineTo(16, 0); ctx.stroke(); // skis (V in flight)
      if (stage === 'fly') { ctx.beginPath(); ctx.moveTo(-14, 10); ctx.lineTo(16, 6); ctx.stroke(); }
      ctx.restore();
      // bars
      if (stage === 'power' || stage === 'lean') {
        ctx.fillStyle = '#0008'; ctx.fillRect(CW / 2 - 110, 300, 220, 22);
        ctx.fillStyle = stage === 'power' ? '#ffb020' : '#22d3ee'; ctx.fillRect(CW / 2 - 108, 302, 216 * s.bar, 18);
        if (stage === 'lean') { ctx.fillStyle = '#39ff14'; ctx.fillRect(CW / 2 - 2, 300, 4, 22); }
      }
      ctx.fillStyle = '#03121e'; ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'left';
      if (stage === 'done' || stage === 'fly') ctx.fillText(`${(40 + (g.current.fx) / 4).toFixed(0)} m`, 16, 32);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [stage, saveBest]);

  const act = () => {
    const s = g.current;
    if (stage === 'ready') { s.bar = 0; s.dir = 1; setStage('power'); }
    else if (stage === 'power') { s.power = s.bar; s.bar = 0.5; s.dir = 1; setStage('lean'); }
    else if (stage === 'lean') { s.lean = 1 - Math.abs(s.bar - 0.5) * 2; s.fx = 0; s.fy = 0; s.vx = 4 + s.power * 7; s.vy = -3 - s.power * 2; setStage('fly'); }
  };
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === ' ' && stage !== 'fly' && stage !== 'done') { e.preventDefault(); act(); } }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); });

  return (
    <Stage title="⛷️ Ski Jump" best={best} onExit={onExit} canvasRef={ref}>
      {(stage === 'ready' || stage === 'power' || stage === 'lean') && <button className="primary big" onClick={act}>{stage === 'ready' ? '▶ Start' : stage === 'power' ? '⚡ Lock POWER' : '📐 Lock LEAN (aim middle)'}</button>}
      {stage === 'fly' && <p className="hint center">In flight…</p>}
      {stage === 'done' && <div className="round-end"><p className="result win">Jumped {g.current.dist} m! 🎉</p><button className="primary big" onClick={() => { g.current.fx = 0; setStage('ready'); }}>▶ Again</button></div>}
    </Stage>
  );
}

// ============ CALIFORNIA: Halfpipe ============
function Halfpipe({ onExit }: { onExit: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [best, saveBest] = useBest('retro-halfpipe');
  const [phase, setPhase] = useState<'ready' | 'ride' | 'done'>('ready');
  const g = useRef({ a: -1, va: 0.05, score: 0, air: 0, spin: 0, rot: 0, inAir: false, hold: false, t: 0, combo: '' });

  useEffect(() => {
    const ctx = ref.current!.getContext('2d')!; let raf = 0;
    const loop = () => {
      const s = g.current;
      if (phase === 'ride') {
        s.t += 1;
        if (!s.inAir) {
          // ride along the U: a goes -1..1 (left lip to right lip)
          s.va += -Math.sin(s.a * Math.PI / 2) * 0.004 + (s.hold ? Math.sign(s.va) * 0.0009 : 0);
          s.a += s.va;
          if (Math.abs(s.a) >= 1) { // launch off a lip
            s.inAir = true; s.air = Math.abs(s.va) * 200; s.rot = 0; s.spin = 0;
          }
        } else {
          s.air -= 1.6; s.rot += s.hold ? 9 : 4; s.spin = s.rot;
          if (s.air <= 0) {
            const spins = Math.floor(s.spin / 360);
            const landClean = (s.spin % 360) < 60 || (s.spin % 360) > 300;
            const pts = landClean ? spins * 50 + 10 : Math.max(0, spins * 20 - 10);
            s.score += pts; s.combo = landClean ? `+${pts} (${spins}×360 clean!)` : spins ? `+${pts} sketchy landing` : '+0';
            s.inAir = false; s.a = Math.sign(s.a) * 0.98; s.va = -Math.sign(s.a) * 0.05;
            setTimeout(() => { if (g.current.combo) g.current.combo = ''; }, 1200);
          }
        }
        if (s.t > 60 * 30) { saveBest(s.score); setPhase('done'); }
      }
      // pipe
      ctx.fillStyle = '#1a1030'; ctx.fillRect(0, 0, CW, CH);
      const sky = ctx.createLinearGradient(0, 0, 0, CH); sky.addColorStop(0, '#ff7e5f'); sky.addColorStop(1, '#feb47b');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, CW, 150);
      // U-pipe
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 10; ctx.beginPath();
      ctx.moveTo(80, 90); ctx.quadraticCurveTo(CW / 2, 430, CW - 80, 90); ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = '#94a3b8';
      // skater position on the curve
      const a = g.current.a; const px = CW / 2 + a * (CW / 2 - 86);
      const baseY = 90 + (1 - a * a) * 250; const py = g.current.inAir ? baseY - g.current.air : baseY;
      ctx.save(); ctx.translate(px, py - 14); ctx.rotate((g.current.inAir ? g.current.rot : a * 50) * Math.PI / 180);
      ctx.fillStyle = '#e9bd96'; ctx.beginPath(); ctx.arc(0, -14, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#a21caf'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 6); ctx.stroke();
      ctx.fillStyle = '#facc15'; ctx.fillRect(-12, 8, 24, 4); // board
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-7, 13, 2.5, 0, 7); ctx.arc(7, 13, 2.5, 0, 7); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'left'; ctx.fillText(`Score ${g.current.score}`, 16, 32);
      ctx.textAlign = 'right'; ctx.fillText(`⏱ ${Math.max(0, 30 - Math.floor(g.current.t / 60))}s`, CW - 16, 32);
      if (g.current.combo) { ctx.fillStyle = '#39ff14'; ctx.textAlign = 'center'; ctx.fillText(g.current.combo, CW / 2, 120); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [phase, saveBest]);

  useEffect(() => {
    const d = (e: KeyboardEvent) => { if (e.key === ' ') { e.preventDefault(); g.current.hold = true; } };
    const u = (e: KeyboardEvent) => { if (e.key === ' ') g.current.hold = false; };
    window.addEventListener('keydown', d); window.addEventListener('keyup', u);
    return () => { window.removeEventListener('keydown', d); window.removeEventListener('keyup', u); };
  });
  const begin = () => { g.current = { a: -0.98, va: 0.06, score: 0, air: 0, spin: 0, rot: 0, inAir: false, hold: false, t: 0, combo: '' }; setPhase('ride'); };

  return (
    <Stage title="🛹 Halfpipe" best={best} onExit={onExit} canvasRef={ref}>
      {phase === 'ready' && <button className="primary big" onClick={begin}>▶ Start — HOLD at the lip to pump & spin</button>}
      {phase === 'ride' && <div className="retro-buttons"><button className="mash" onPointerDown={() => (g.current.hold = true)} onPointerUp={() => (g.current.hold = false)} onPointerLeave={() => (g.current.hold = false)}>HOLD to pump / spin 🛹</button></div>}
      {phase === 'done' && <div className="round-end"><p className="result win">{g.current.score} points! 🤙</p><button className="primary big" onClick={begin}>▶ Again</button></div>}
    </Stage>
  );
}
