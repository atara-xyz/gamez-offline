// Travle — build a land route from a start country to a target by naming countries
// that share a border, one step at a time. Teaches neighbours & regional geography.
import { useMemo, useState } from 'react';
import { type Country, type Difficulty, answerPool, byId, WORLD } from '../data';
import { mulberry32, pick } from '../random';
import { CountryGuessInput, Flag, useAutoFocus, useEnterToAdvance } from '../ui';

function bfsDist(fromId: string): Map<string, number> {
  const dist = new Map([[fromId, 0]]);
  let frontier = [fromId];
  while (frontier.length) {
    const next: string[] = [];
    for (const id of frontier) for (const n of byId.get(id)?.borders ?? []) {
      if (dist.has(n) || !byId.has(n)) continue;
      dist.set(n, dist.get(id)! + 1); next.push(n);
    }
    frontier = next;
  }
  return dist;
}

function makePuzzle(pool: Country[], rng: () => number) {
  const starts = pool.filter((c) => (c.borders?.length ?? 0) >= 2);
  for (let t = 0; t < 80; t++) {
    const start = pick(starts, rng);
    const dist = bfsDist(start.id);
    const ends = pool.filter((c) => { const d = dist.get(c.id); return d != null && d >= 3 && d <= 5; });
    if (ends.length) { const end = pick(ends, rng); return { start, end, par: dist.get(end.id)! }; }
  }
  const start = pick(starts, rng);
  const dist = bfsDist(start.id);
  const end = [...dist.entries()].sort((a, b) => b[1] - a[1])[0];
  return { start, end: byId.get(end[0])!, par: end[1] };
}

// World map highlighting the route so far (start, visited hops, target).
function RouteMap({ chain, end }: { chain: Country[]; end: Country }) {
  const visited = new Set(chain.map((c) => c.id));
  const color = (id: string) => {
    if (id === end.id) return '#f72585';            // target
    if (id === chain[0].id) return '#22d3ee';       // start
    if (visited.has(id)) return '#22c55e';          // visited hop
    return '#16233b';
  };
  return (
    <svg className="worldmap travle-map" viewBox={`0 0 ${WORLD.width} ${WORLD.height}`} role="img" aria-label="Route map">
      {Object.entries(WORLD.paths).map(([id, d]) => (
        <path key={id} d={d} fill={color(id)} stroke="#0a1424" strokeWidth={0.3} />
      ))}
    </svg>
  );
}

export function Travle({
  difficulty,
  seed,
  onResult,
}: {
  difficulty: Difficulty;
  seed?: number;
  onResult: (win: boolean, points: number) => void;
}) {
  const pool = useMemo(() => answerPool(difficulty), [difficulty]);
  const [round, setRound] = useState(0);
  const { start, end, par } = useMemo(() => {
    const rng = seed != null ? mulberry32(seed + round) : Math.random;
    return makePuzzle(pool, rng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, round, seed]);

  const [chain, setChain] = useState<Country[]>([start]);
  const [msg, setMsg] = useState('');
  const last = chain[chain.length - 1];
  const won = last.id === end.id;
  const steps = chain.length - 1;
  const maxSteps = par + 6;
  const lost = !won && steps >= maxSteps;
  const over = won || lost;
  const focusRef = useAutoFocus(start.id + round);

  function guess(c: Country) {
    if (over) return;
    if (chain.some((x) => x.id === c.id)) return setMsg(`Already used ${c.name}`), void setTimeout(() => setMsg(''), 1400);
    if (!last.borders.includes(c.id)) return setMsg(`${c.name} doesn't border ${last.name}`), void setTimeout(() => setMsg(''), 1600);
    const next = [...chain, c];
    setChain(next);
    setMsg('');
    if (c.id === end.id) onResult(true, Math.max(25, 100 - (next.length - 1 - par) * 15));
    else if (next.length - 1 >= maxSteps) onResult(false, 0);
  }
  function nextRound() { setMsg(''); setRound((r) => r + 1); }
  useEnterToAdvance(over, nextRound);

  // When the puzzle changes (new round), reset the chain to the new start.
  if (chain[0]?.id !== start.id) setChain([start]);

  return (
    <div className="game travle">
      <div className="travle-goal">
        <span className="t-end"><Flag cca2={start.cca2} /> {start.name}</span>
        <span className="t-arrow">✈️ → 🎯</span>
        <span className="t-end"><Flag cca2={end.cca2} /> {end.name}</span>
      </div>
      <p className="hint center">Hop country-to-country by land · par {par} · used {steps}/{maxSteps}</p>

      {/* Route map — Easy & Medium only; Hard removes it. */}
      {difficulty <= 2 && <RouteMap chain={chain} end={end} />}

      <div className="travle-chain">
        {chain.map((c, i) => (
          <span key={c.id} className={`t-node ${c.id === end.id ? 'goal' : ''}`}>
            {i > 0 && <span className="t-sep">→</span>}
            <Flag cca2={c.cca2} /> {c.name}
          </span>
        ))}
      </div>

      {!over && (
        <div ref={focusRef}>
          <CountryGuessInput onGuess={guess} placeholder={`A country bordering ${last.name}…`} />
        </div>
      )}
      {msg && <p className="w-msg">{msg}</p>}

      {over && (
        <div className="round-end">
          <p className={won ? 'result win' : 'result lose'}>
            {won ? `Made it in ${steps} steps! (par ${par}) 🎉` : `Out of moves — couldn't reach ${end.name}.`}
          </p>
          <button className="primary big" onClick={nextRound}>▶ New route</button>
        </div>
      )}
    </div>
  );
}
