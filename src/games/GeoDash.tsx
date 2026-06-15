// Geo Dash — one-touch skill runner (Geometry-Dash-style) with PROCEDURAL levels.
// FOUR vehicles you switch between via portals:
//   • CUBE — tap/hold to jump; jump-pads launch you higher; land on blocks.
//   • SHIP — hold to fly up, release to fall; thread the corridors.
//   • WAVE — hold = fly up at 45°, release = down at 45°: a tight, PROMINENT zig-zag.
//   • BALL — tap to flip gravity (floor↔ceiling); roll along surfaces, dodge spikes.
// Collect 🪙 coins. Difficulty (speed + density) ramps with distance. Physics are
// tuned so generated levels are always clearable. Best distance saved per device.
import { useEffect, useRef, useState } from 'react';
import type { Difficulty } from '../data';

type Mode = 'cube' | 'ship' | 'wave' | 'ball';
const ORDER: Mode[] = ['cube', 'ship', 'wave', 'ball'];

const W = 960, H = 360;
const GY = 300;           // ground Y
const PX = 150;           // player x
const PS = 30;            // player size
const G = 0.9;            // cube gravity
const JUMP = -13.6;
const PAD_JUMP = -18.5;   // jump-pad launch
const SHIP_THRUST = -0.62;
const SHIP_G = 0.46;
const BALL_G = 0.78;      // ball gravity (toward current surface)
const SW = 30;            // spike width
const LAND_TOL = 9;

type Item =
  | { k: 'spike'; x: number; w: number; h: number; ceil?: boolean }
  | { k: 'block'; x: number; w: number; h: number; ceil?: boolean }
  | { k: 'pad'; x: number; w: number }
  | { k: 'portal'; x: number; mode: Mode };
type Coin = { x: number; y: number; got: boolean };

interface State {
  phase: 'ready' | 'playing' | 'dead';
  mode: Mode;
  py: number; vy: number; grounded: boolean; angle: number; gravDir: 1 | -1;
  wDir: 1 | -1; tapped: boolean;
  items: Item[]; coins: Coin[];
  cursor: number; section: { type: Mode; endX: number };
  dist: number; spd: number; held: boolean; coinCount: number;
  trail: { x: number; y: number }[];
  parts: { x: number; y: number; vx: number; vy: number; life: number; c: string }[];
  startSpd: number;
}

function freshState(startSpd: number): State {
  return {
    phase: 'ready', mode: 'cube', py: GY - PS, vy: 0, grounded: true, angle: 0, gravDir: 1,
    wDir: 1, tapped: false,
    items: [], coins: [], cursor: W + 200, section: { type: 'cube', endX: 1700 },
    dist: 0, spd: startSpd, held: false, coinCount: 0, trail: [], parts: [], startSpd,
  };
}

export function GeoDash({ difficulty }: { difficulty: Difficulty }) {
  const startSpd = difficulty === 1 ? 4.7 : difficulty === 2 ? 5.5 : 6.4;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const st = useRef<State>(freshState(startSpd));
  const [phase, setPhase] = useState<'ready' | 'playing' | 'dead'>('ready');
  const [result, setResult] = useState({ d: 0, coins: 0 });
  const [best, setBest] = useState(() => Number(localStorage.getItem('geo-dash-best') || 0));

  const seed = useRef(0x9e3779b9);
  const rnd = () => {
    let s = (seed.current = (seed.current + 0x6d2b79f5) | 0);
    s = Math.imul(s ^ (s >>> 15), 1 | s);
    s = (s + Math.imul(s ^ (s >>> 7), 61 | s)) ^ s;
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };

  function start() {
    seed.current = (Date.now() & 0xffffffff) | 1;
    st.current = freshState(startSpd);
    st.current.phase = 'playing';
    setPhase('playing');
  }
  // test-only hook: force the current section into a given vehicle so automated
  // checks can exercise each mode without surviving the whole run first.
  (window as unknown as { __dashForce?: (m: Mode) => void }).__dashForce = (m: Mode) => {
    const s = st.current;
    s.mode = m; s.section = { type: m, endX: s.cursor + 4000 };
    s.items = s.items.filter((o) => o.x < PX - 40 || o.x > PX + 260); // clear the lane ahead
    s.vy = 0; s.gravDir = 1;
  };
  function press() {
    const s = st.current;
    if (s.phase !== 'playing') { start(); return; }
    s.held = true;
    s.tapped = true; // edge flag consumed by ball (gravity flip) each press
    if (s.mode === 'cube' && s.grounded) { s.vy = JUMP; s.grounded = false; }
  }

  // ---- procedural generators (one per vehicle) ----
  function genCube(x: number, diff: number) {
    const items: Item[] = []; const coins: Coin[] = [];
    const r = rnd();
    let width = SW;
    if (r < 0.14) {
      items.push({ k: 'pad', x, w: 34 });
      coins.push({ x: x + 120, y: GY - 150, got: false });
      width = 34;
    } else if (r < 0.32 + diff * 0.14) {
      const h = 34 + Math.floor(rnd() * (14 + diff * 18));
      const w = 60 + Math.floor(rnd() * 60);
      items.push({ k: 'block', x, w, h });
      coins.push({ x: x + w / 2, y: GY - h - 40, got: false });
      width = w;
    } else {
      const maxRun = diff < 0.25 ? 1 : diff < 0.55 ? 2 : 3;
      const run = 1 + Math.floor(rnd() * maxRun);
      for (let i = 0; i < run; i++) items.push({ k: 'spike', x: x + i * SW, w: SW, h: 30 });
      coins.push({ x: x + (run * SW) / 2, y: GY - 92, got: false });
      width = run * SW;
    }
    return { items, coins, width };
  }
  function genShip(x: number, diff: number) {
    const items: Item[] = []; const coins: Coin[] = [];
    const gap = 150 - diff * 36;
    const topH = 20 + Math.floor(rnd() * (GY - gap - 40));
    const botH = GY - gap - topH;
    const w = 48 + Math.floor(rnd() * 34);
    items.push({ k: 'block', x, w, h: topH, ceil: true });
    items.push({ k: 'block', x, w, h: botH });
    coins.push({ x: x + w / 2, y: topH + gap / 2 - 7, got: false });
    return { items, coins, width: w };
  }
  // WAVE — narrow corridors forcing a tight 45° zig-zag. Gap shrinks with difficulty.
  function genWave(x: number, diff: number) {
    const items: Item[] = []; const coins: Coin[] = [];
    const gap = 132 - diff * 34;                  // tighter than ship → the zig-zag
    const topH = 16 + Math.floor(rnd() * (GY - gap - 32));
    const botH = GY - gap - topH;
    const w = 40 + Math.floor(rnd() * 26);
    items.push({ k: 'block', x, w, h: topH, ceil: true });
    items.push({ k: 'block', x, w, h: botH });
    coins.push({ x: x + w / 2, y: topH + gap / 2 - 7, got: false });
    return { items, coins, width: w };
  }
  // BALL — spikes on floor and ceiling; flip gravity to weave between them.
  function genBall(x: number, diff: number) {
    const items: Item[] = []; const coins: Coin[] = [];
    const onCeil = rnd() < 0.5;
    const run = 1 + Math.floor(rnd() * (diff < 0.5 ? 1 : 2));
    for (let i = 0; i < run; i++) items.push({ k: 'spike', x: x + i * SW, w: SW, h: 30, ceil: onCeil });
    coins.push({ x: x + (run * SW) / 2, y: onCeil ? GY - 40 : 40, got: false });
    return { items, coins, width: run * SW };
  }

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!;
    let raf = 0;
    const die = () => {
      const s = st.current; s.phase = 'dead';
      for (let i = 0; i < 24; i++) s.parts.push({ x: PX + PS / 2, y: s.py + PS / 2, vx: (rnd() - 0.5) * 10, vy: (rnd() - 0.7) * 10, life: 1, c: rnd() < 0.4 ? '#ffd34d' : '#22d3ee' });
      const d = Math.floor(s.dist / 10);
      setResult({ d, coins: s.coinCount }); setPhase('dead');
      if (d > Number(localStorage.getItem('geo-dash-best') || 0)) { localStorage.setItem('geo-dash-best', String(d)); setBest(d); }
    };

    function step() {
      const s = st.current;
      ctx.clearRect(0, 0, W, H);
      // background grid (tinted per vehicle)
      const BG: Record<Mode, [string, string]> = {
        cube: ['#060b18', '#12203c'], ship: ['#0a0820', '#241a4a'],
        wave: ['#04121a', '#0e3a44'], ball: ['#120814', '#3a1a3a'],
      };
      ctx.fillStyle = BG[s.mode][0];
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = BG[s.mode][1];
      ctx.lineWidth = 1;
      const off = s.dist % 48;
      for (let x = -off; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GY); ctx.stroke(); }
      for (let y = 0; y < GY; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      if (s.phase === 'playing') {
        const diff = Math.min(1, s.dist / 9000);
        s.spd = s.startSpd + diff * 4.2;
        s.dist += s.spd;

        // spawn ahead. `cursor` is an ABSOLUTE world-x (monotonic); the player's
        // absolute x is `dist + PX`, so screen-x = cursor - dist. Sections switch
        // at absolute distances, so the ship/cube portals actually appear.
        const SECTION_LEN: Record<Mode, number> = { cube: 1500, ship: 900, wave: 800, ball: 950 };
        while (s.cursor < s.dist + W + 420) {
          const sx = s.cursor - s.dist;
          if (s.cursor >= s.section.endX) {
            const nm = ORDER[(ORDER.indexOf(s.section.type) + 1) % ORDER.length];
            s.items.push({ k: 'portal', x: sx, mode: nm });
            s.section = { type: nm, endX: s.cursor + SECTION_LEN[nm] + rnd() * 500 };
            s.cursor += 230;
            continue;
          }
          const g = s.section.type === 'cube' ? genCube(sx, diff)
            : s.section.type === 'ship' ? genShip(sx, diff)
            : s.section.type === 'wave' ? genWave(sx, diff)
            : genBall(sx, diff);
          s.items.push(...g.items); s.coins.push(...g.coins);
          const gapByMode: Record<Mode, number> = {
            cube: Math.max(82, 230 - diff * 90 + rnd() * 60),
            ship: Math.max(120, 200 - diff * 50 + rnd() * 50),
            wave: Math.max(150, 240 - diff * 60 + rnd() * 40),
            ball: Math.max(95, 220 - diff * 80 + rnd() * 55),
          };
          s.cursor += g.width + gapByMode[s.section.type];
        }
        // scroll everything left
        for (const o of s.items) o.x -= s.spd;
        for (const c of s.coins) c.x -= s.spd;
        s.items = s.items.filter((o) => o.x + (('w' in o ? o.w : 30)) > -60);
        s.coins = s.coins.filter((c) => c.x > -30);

        // portal trigger (reset orientation on switch)
        for (const o of s.items) if (o.k === 'portal' && o.x <= PX + PS / 2 && o.x > PX - PS) {
          if (s.mode !== o.mode) { s.mode = o.mode; s.vy = 0; s.gravDir = 1; s.wDir = s.held ? -1 : 1; }
        }

        // physics
        const prevFeet = s.py + PS;
        if (s.mode === 'cube') {
          s.vy += G; s.py += s.vy;
          if (!s.grounded) s.angle += s.spd * 0.012;
          let surface = GY;
          for (const o of s.items) if (o.k === 'block' && !o.ceil && PX + PS > o.x && PX < o.x + o.w) {
            const top = GY - o.h; if (prevFeet <= top + LAND_TOL) surface = Math.min(surface, top);
          }
          if (s.py + PS >= surface) { s.py = surface - PS; s.vy = 0; s.grounded = true; s.angle = Math.round(s.angle / (Math.PI / 2)) * (Math.PI / 2); }
          else s.grounded = false;
          for (const o of s.items) if (o.k === 'pad' && PX + PS > o.x && PX < o.x + o.w && s.py + PS >= GY - 6) { s.vy = PAD_JUMP; s.grounded = false; }
          if (s.held && s.grounded) { s.vy = JUMP; s.grounded = false; }
        } else if (s.mode === 'ship') {
          s.vy += s.held ? SHIP_THRUST : SHIP_G;
          s.vy = Math.max(-7.5, Math.min(8.5, s.vy));
          s.py += s.vy;
          s.angle = Math.max(-0.5, Math.min(0.5, s.vy * 0.05));
          if (s.py < 0) { s.py = 0; s.vy = 0; }
          if (s.py + PS > GY) { s.py = GY - PS; s.vy = 0; }
        } else if (s.mode === 'wave') {
          // constant-speed 45° zig-zag: up while held, down while released.
          s.wDir = s.held ? -1 : 1;
          s.py += s.wDir * s.spd;
          s.angle = s.wDir * -0.7;
          if (s.py < 0) { s.py = 0; }
          if (s.py + PS > GY) { s.py = GY - PS; }
        } else {
          // ball: tap flips gravity; falls toward current surface and rolls.
          if (s.tapped) { s.gravDir *= -1 as 1 | -1; }
          s.vy += BALL_G * s.gravDir;
          s.vy = Math.max(-12, Math.min(12, s.vy));
          s.py += s.vy;
          s.angle += s.spd * 0.02 * s.gravDir;
          // floor / ceiling, plus landing on block tops/bottoms
          let floor = GY, ceil = 0;
          for (const o of s.items) if (o.k === 'block' && PX + PS > o.x && PX < o.x + o.w) {
            if (o.ceil) ceil = Math.max(ceil, o.h); else floor = Math.min(floor, GY - o.h);
          }
          if (s.py + PS >= floor) { s.py = floor - PS; if (s.gravDir === 1) s.vy = 0; }
          if (s.py <= ceil) { s.py = ceil; if (s.gravDir === -1) s.vy = 0; }
          s.grounded = s.py + PS >= floor - 1 || s.py <= ceil + 1;
        }
        s.tapped = false;

        // collisions (death) — spikes can be floor or ceiling now
        for (const o of s.items) {
          if (o.k === 'spike') {
            const overlapX = PX + PS > o.x + 6 && PX < o.x + o.w - 6;
            if (!overlapX) continue;
            if (o.ceil) { if (s.py < o.h - 6) { die(); break; } }
            else if (s.py + PS > GY - o.h + 6) { die(); break; }
          } else if (o.k === 'block') {
            const bot = o.ceil ? o.h : GY;
            const top = o.ceil ? 0 : GY - o.h;
            const overlapX = PX + PS > o.x && PX < o.x + o.w;
            if (!overlapX) continue;
            if (o.ceil) { if (s.py < bot && s.mode !== 'ball') { die(); break; } }
            else if (s.py + PS > top + LAND_TOL && s.py < bot && s.mode !== 'ball') { die(); break; }
          }
        }
        // coins
        for (const c of s.coins) if (!c.got && PX + PS > c.x - 9 && PX < c.x + 9 && s.py + PS > c.y - 9 && s.py < c.y + 9) { c.got = true; s.coinCount++; }

        s.trail.push({ x: PX, y: s.py });
        if (s.trail.length > 12) s.trail.shift();
      }

      // ground
      ctx.fillStyle = '#0a1730'; ctx.fillRect(0, GY, W, H - GY);
      ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, GY); ctx.lineTo(W, GY); ctx.stroke();

      // items
      const PORTAL_COL: Record<Mode, [string, string]> = {
        cube: ['#5fe0ff', '#1f9fe0'], ship: ['#e879f9', '#7b2d8e'],
        wave: ['#34f5d0', '#0e7490'], ball: ['#ff8a3d', '#7b2d2d'],
      };
      for (const o of s.items) {
        if (o.k === 'spike') {
          ctx.fillStyle = '#f72585'; ctx.beginPath();
          if (o.ceil) { ctx.moveTo(o.x, 0); ctx.lineTo(o.x + o.w / 2, o.h); ctx.lineTo(o.x + o.w, 0); }
          else { ctx.moveTo(o.x, GY); ctx.lineTo(o.x + o.w / 2, GY - o.h); ctx.lineTo(o.x + o.w, GY); }
          ctx.closePath(); ctx.fill();
        } else if (o.k === 'block') {
          const top = o.ceil ? 0 : GY - o.h;
          ctx.fillStyle = o.ceil ? '#7b2d8e' : '#1f6feb';
          ctx.strokeStyle = o.ceil ? '#e879f9' : '#7dd3fc'; ctx.lineWidth = 2;
          ctx.fillRect(o.x, top, o.w, o.h); ctx.strokeRect(o.x, top, o.w, o.h);
        } else if (o.k === 'pad') {
          ctx.fillStyle = '#ffd34d'; ctx.beginPath();
          ctx.moveTo(o.x - 4, GY); ctx.lineTo(o.x + o.w / 2, GY - 16); ctx.lineTo(o.x + o.w + 4, GY); ctx.closePath(); ctx.fill();
        } else if (o.k === 'portal') {
          const grd = ctx.createLinearGradient(o.x, 0, o.x, GY);
          const col = PORTAL_COL[o.mode];
          grd.addColorStop(0, col[0]); grd.addColorStop(1, col[1]);
          ctx.fillStyle = grd; ctx.globalAlpha = 0.5; ctx.fillRect(o.x, 0, 14, GY); ctx.globalAlpha = 1;
        }
      }
      // coins
      for (const c of s.coins) {
        if (c.got) continue;
        ctx.fillStyle = '#ffd34d'; ctx.strokeStyle = '#a9760a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(c.x, c.y, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }

      // player
      const PCOL: Record<Mode, string> = { cube: '#22d3ee', ship: '#e879f9', wave: '#34f5d0', ball: '#ff8a3d' };
      if (s.phase !== 'dead') {
        s.trail.forEach((t, i) => { ctx.globalAlpha = (i / s.trail.length) * (s.mode === 'wave' ? 0.5 : 0.3); ctx.fillStyle = PCOL[s.mode]; ctx.fillRect(t.x + 5, t.y + 5, PS - 10, PS - 10); });
        ctx.globalAlpha = 1;
        ctx.save(); ctx.translate(PX + PS / 2, s.py + PS / 2); ctx.rotate(s.angle);
        ctx.shadowColor = PCOL[s.mode]; ctx.shadowBlur = 16;
        if (s.mode === 'ship') {
          ctx.fillStyle = '#c084fc'; ctx.beginPath();
          ctx.moveTo(-PS / 2, -PS / 2 + 4); ctx.lineTo(PS / 2 + 4, 0); ctx.lineTo(-PS / 2, PS / 2 - 4); ctx.closePath(); ctx.fill();
          ctx.shadowBlur = 0; ctx.fillStyle = '#22d3ee'; ctx.fillRect(-8, -8, 14, 14);
        } else if (s.mode === 'wave') {
          ctx.fillStyle = '#34f5d0'; ctx.beginPath();           // diamond/arrow
          ctx.moveTo(PS / 2, 0); ctx.lineTo(0, -PS / 2 + 3); ctx.lineTo(-PS / 2 + 4, 0); ctx.lineTo(0, PS / 2 - 3); ctx.closePath(); ctx.fill();
        } else if (s.mode === 'ball') {
          ctx.fillStyle = '#ff8a3d'; ctx.beginPath(); ctx.arc(0, 0, PS / 2, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0; ctx.fillStyle = '#3a1a0a'; ctx.fillRect(-PS / 2 + 4, -3, PS - 8, 6);
        } else {
          const grad = ctx.createLinearGradient(-PS / 2, -PS / 2, PS / 2, PS / 2);
          grad.addColorStop(0, '#5fe0ff'); grad.addColorStop(1, '#1f9fe0'); ctx.fillStyle = grad;
          ctx.fillRect(-PS / 2, -PS / 2, PS, PS); ctx.shadowBlur = 0;
          ctx.fillStyle = '#03121e'; ctx.fillRect(-6, -6, 12, 12);
        }
        ctx.restore();
      } else {
        for (const p of s.parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.4; p.life -= 0.02; if (p.life <= 0) continue; ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 7, 7); }
        ctx.globalAlpha = 1;
      }

      // HUD
      ctx.fillStyle = '#e8f1ff'; ctx.font = 'bold 22px system-ui, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(`${Math.floor(s.dist / 10)} m`, W - 18, 34);
      ctx.fillStyle = '#ffd34d'; ctx.textAlign = 'left';
      ctx.fillText(`🪙 ${s.coinCount}`, 18, 34);
      (window as unknown as { __dash?: unknown }).__dash = {
        d: Math.floor(s.dist / 10), phase: s.phase, mode: s.mode, coins: s.coinCount,
        py: s.py, grounded: s.grounded, GY, PX, PS,
        items: s.items.map((o) => ({ k: o.k, x: o.x, w: 'w' in o ? o.w : 0, h: 'h' in o ? o.h : 0, ceil: 'ceil' in o ? !!o.ceil : false })),
      };

      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') { e.preventDefault(); press(); } };
    const up = (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') st.current.held = false; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="game geodash">
      <p className="hint center">Tap/Space — <b>cube</b> jump · <b>ship</b> hold to fly · <b>wave</b> zig-zag · <b>ball</b> flip gravity · grab 🪙</p>
      <div className="dash-stage"
        onPointerDown={(e) => { e.preventDefault(); press(); }}
        onPointerUp={() => { st.current.held = false; }}
        onPointerLeave={() => { st.current.held = false; }}>
        <canvas ref={canvasRef} width={W} height={H} className="dash-canvas" />
        {phase !== 'playing' && (
          <div className="dash-overlay">
            {phase === 'dead' ? (
              <>
                <div className="dash-big">💥 Crashed!</div>
                <div className="dash-score">{result.d} m · 🪙 {result.coins}{result.d >= best && result.d > 0 ? ' · NEW BEST!' : ''}</div>
                <div className="dash-best">Best: {best} m</div>
                <button className="primary big" onClick={start}>▶ Retry</button>
              </>
            ) : (
              <>
                <div className="dash-big">🟦 Geo Dash</div>
                <div className="dash-best">Best: {best} m · cube & ship modes</div>
                <button className="primary big" onClick={start}>▶ Tap to start</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
