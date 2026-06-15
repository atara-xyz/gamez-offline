// "Name all 30 NBA teams." Type teams; each one fills into its division slot.
// Tracks count + time. Reveal-the-rest button when you give up.
import { useMemo, useState } from 'react';
import { type NbaTeam, NBA } from '../data';
import { proportionScore } from '../scoring';
import { TeamGuessInput, TeamLogo } from './NbaShared';

const DIVS = ['Atlantic', 'Central', 'Southeast', 'Northwest', 'Pacific', 'Southwest'];

export function NbaNameAll({ onResult }: { onResult: (win: boolean, points: number) => void }) {
  const [found, setFound] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [bump, setBump] = useState<string | null>(null);

  const byDiv = useMemo(() => {
    const m: Record<string, NbaTeam[]> = {};
    for (const d of DIVS) m[d] = NBA.filter((t) => t.div === d).sort((a, b) => a.city.localeCompare(b.city));
    return m;
  }, []);

  const done = found.size === NBA.length;
  const over = done || revealed;

  function guess(t: NbaTeam) {
    if (over || found.has(t.id)) return;
    const next = new Set(found);
    next.add(t.id);
    setFound(next);
    setBump(t.id);
    setTimeout(() => setBump(null), 500);
    if (next.size === NBA.length) onResult(true, 100);
  }

  function reset() {
    setFound(new Set());
    setRevealed(false);
  }

  return (
    <div className="game nba nameall">
      <div className="nameall-head">
        <p className="hint">
          Name all <strong>{NBA.length}</strong> NBA teams · found{' '}
          <strong className="count">{found.size}/{NBA.length}</strong>
        </p>
        {!over && <button className="ghost" onClick={() => { setRevealed(true); onResult(false, proportionScore(found.size, NBA.length)); }}>Give up</button>}
        {over && <button className="primary" onClick={reset}>↺ Play again</button>}
      </div>

      {!over && <TeamGuessInput onGuess={guess} exclude={found} placeholder="Name a team…" autoFocus />}

      {done && <p className="result win">🎉 You named all {NBA.length}! Hoops legend.</p>}
      {revealed && !done && <p className="result lose">Found {found.size}/{NBA.length} — the missing ones are dimmed.</p>}

      <div className="div-grid">
        {DIVS.map((d) => (
          <div key={d} className="div-col">
            <h3>{d}</h3>
            {byDiv[d].map((t) => {
              const got = found.has(t.id);
              const show = got || revealed;
              return (
                <div key={t.id} className={`team-slot ${got ? 'got' : show ? 'missed' : 'empty'} ${bump === t.id ? 'bump' : ''}`}>
                  {show ? (
                    <><TeamLogo team={t} className="mini" /> <span>{t.full}</span></>
                  ) : (
                    <span className="blank">· · ·</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
