// Cities — the "dive deep into ONE country" mode. Reached either from a country
// win (the fact card's Explore button) or from the menu (pick a country first).
// You guess that country's cities; pins land on the real country shape.
import { useMemo, useState } from 'react';
import { type City, type Country, type Difficulty, CITIES, COUNTRIES } from '../data';
import { directionArrow, distanceKm, formatKm, proximityColor, proximityPct } from '../geo';
import { cityProjector, cityShapePath } from '../shape';
import { mulberry32, pick } from '../random';
import { roundScore } from '../scoring';
import { Flag, useEnterToAdvance, useAutoFocus } from '../ui';

const MIN_CITIES = 5; // only let you dive into countries with enough cities

function pickableCountries(difficulty: Difficulty): Country[] {
  return COUNTRIES.filter(
    (c) => c.tier <= difficulty && (CITIES[c.id]?.length ?? 0) >= MIN_CITIES,
  ).sort((a, b) => b.population - a.population);
}

/** Local equirectangular fallback when a country has no baked shape. */
function fallbackProjection(cities: City[]) {
  const lats = cities.map((c) => c.lat);
  const lngs = cities.map((c) => c.lng);
  let minLat = Math.min(...lats), maxLat = Math.max(...lats);
  let minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const pad = 0.15;
  const dLat = (maxLat - minLat) * pad + 0.5;
  const dLng = (maxLng - minLng) * pad + 0.5;
  minLat -= dLat; maxLat += dLat; minLng -= dLng; maxLng += dLng;
  const span = Math.max(maxLat - minLat, maxLng - minLng) || 1;
  return (lat: number, lng: number) => ({
    x: ((lng - minLng) / span) * 100,
    y: (1 - (lat - minLat) / span) * 100,
  });
}

function CountryPicker({
  difficulty,
  onPick,
}: {
  difficulty: Difficulty;
  onPick: (c: Country) => void;
}) {
  const [q, setQ] = useState('');
  const all = useMemo(() => pickableCountries(difficulty), [difficulty]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (s ? all.filter((c) => c.name.toLowerCase().includes(s)) : all).slice(0, 60);
  }, [q, all]);
  return (
    <div className="city-picker">
      <p className="hint">Pick a country to explore its cities:</p>
      <input
        className="picker-search"
        placeholder="Search a country…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
      />
      <div className="picker-grid">
        {list.map((c) => (
          <button key={c.id} className="picker-tile" onClick={() => onPick(c)}>
            <Flag cca2={c.cca2} />
            <span>{c.name}</span>
            <span className="muted">{CITIES[c.id].length} cities</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function Cities({
  country,
  difficulty,
  seed,
  onResult,
}: {
  country: Country | null;
  difficulty: Difficulty;
  seed?: number;
  onResult: (win: boolean, points: number) => void;
}) {
  const [selected, setSelected] = useState<Country | null>(country);
  const [round, setRound] = useState(0);

  if (!selected) {
    return <CountryPicker difficulty={difficulty} onPick={setSelected} />;
  }
  return (
    <CityRound
      key={selected.id + round}
      country={selected}
      seed={seed}
      onResult={onResult}
      onChangeCountry={() => setSelected(null)}
      onNext={() => setRound((r) => r + 1)}
      round={round}
    />
  );
}

function CityRound({
  country,
  seed,
  round,
  onResult,
  onChangeCountry,
  onNext,
}: {
  country: Country;
  seed?: number;
  round: number;
  onResult: (win: boolean, points: number) => void;
  onChangeCountry: () => void;
  onNext: () => void;
}) {
  const cities = CITIES[country.id] ?? [];
  const project = useMemo(
    () => cityProjector(country.id) ?? fallbackProjection(cities),
    [country.id, cities],
  );
  const path = cityShapePath(country.id);

  const answer = useMemo(() => {
    const rng = seed != null ? mulberry32(seed + round + 99) : Math.random;
    // Bias toward bigger, more famous cities.
    const famous = cities.slice(0, Math.max(3, Math.ceil(cities.length / 2)));
    return pick(famous, rng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country.id, round, seed]);

  const [guesses, setGuesses] = useState<City[]>([]);
  const [text, setText] = useState('');
  const maxGuesses = 6;

  const solved = guesses.some((g) => g.name === answer.name);
  const lost = !solved && guesses.length >= maxGuesses;
  const over = solved || lost;
  useEnterToAdvance(over, onNext);
  const focusRef = useAutoFocus(answer.name);

  const suggestions = useMemo(() => {
    const s = text.trim().toLowerCase();
    if (!s) return [];
    return cities
      .filter((c) => c.name.toLowerCase().startsWith(s) && !guesses.some((g) => g.name === c.name))
      .slice(0, 6);
  }, [text, cities, guesses]);

  function guess(city: City) {
    if (over) return;
    const next = [...guesses, city];
    setGuesses(next);
    setText('');
    if (city.name === answer.name) onResult(true, roundScore(true, next.length, maxGuesses));
    else if (next.length >= maxGuesses) onResult(false, 0);
  }

  const ap = project(answer.lat, answer.lng);

  // The mystery city's location is shown from the start (this is "name the pin"),
  // and progressive facts unlock as you guess so it's beatable for kids.
  const rank = cities.findIndex((c) => c.name === answer.name) + 1;
  const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  const facts = [
    `It’s the ${ordinal(rank)} biggest city — about ${answer.pop.toLocaleString()} people.`,
    `Its name starts with “${answer.name[0]}”.`,
    `The first letters are “${answer.name.slice(0, Math.min(3, answer.name.length - 1))}…”.`,
  ];
  const factsShown = facts.slice(0, guesses.length);

  return (
    <div className="game cities">
      <div className="city-head">
        <Flag cca2={country.cca2} className="city-flag" />
        <div>
          <h2>{country.name}</h2>
          <p className="hint small">
            Name the <span className="target-word">◎ highlighted city</span> — facts unlock if you get stuck.
          </p>
        </div>
        <button className="ghost" onClick={onChangeCountry}>↺ Change country</button>
      </div>

      <svg className="citymap" viewBox="0 0 100 100" role="img" aria-label={`${country.name} map`}>
        {path && <path d={path} fill="#0e2236" stroke="#1f4d6b" strokeWidth={0.4} />}
        {cities.map((c, i) => {
          const p = project(c.lat, c.lng);
          return <circle key={'bg' + i} cx={p.x} cy={p.y} r={0.9} fill="#33506e" />;
        })}
        {/* the mystery target marker (pulsing) — shown until solved */}
        {!over && (
          <g className="target-pin">
            <circle cx={ap.x} cy={ap.y} r={3.4} fill="none" stroke="#f72585" strokeWidth={1.1} />
            <circle cx={ap.x} cy={ap.y} r={1.2} fill="#f72585" />
            <text x={ap.x} y={ap.y - 4.5} className="pin-label target">?</text>
          </g>
        )}
        {guesses.map((g, i) => {
          const p = project(g.lat, g.lng);
          const km = distanceKm(g, answer);
          const win = g.name === answer.name;
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={2.3} fill={win ? '#22c55e' : proximityColor(km)} stroke="#0a1424" strokeWidth={0.3} />
              <text x={p.x} y={p.y - 3} className="pin-label">{g.name}</text>
            </g>
          );
        })}
        {over && (
          <g>
            <circle cx={ap.x} cy={ap.y} r={3} fill="none" stroke="#22c55e" strokeWidth={0.8} />
            <text x={ap.x} y={ap.y + 6} className="pin-label win">{answer.name}</text>
          </g>
        )}
      </svg>

      {!over && factsShown.length > 0 && (
        <div className="img-hints">
          {factsShown.map((f, i) => (
            <span key={i} className="img-hint">💡 {f}</span>
          ))}
        </div>
      )}

      {!over && (
        <div className="guess-input" ref={focusRef}>
          <input
            value={text}
            placeholder={`City in ${country.name}…`}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && suggestions[0] && guess(suggestions[0])}
          />
          <button className="primary" onClick={() => suggestions[0] && guess(suggestions[0])}>
            Guess
          </button>
          {suggestions.length > 0 && (
            <ul className="suggest">
              {suggestions.map((c) => (
                <li key={c.name} onMouseDown={(e) => { e.preventDefault(); guess(c); }}>
                  {c.name} <span className="muted">· {c.pop.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="hint small">{maxGuesses - guesses.length} guesses left</p>
        </div>
      )}

      <div className="guesses">
        {[...guesses].reverse().map((g, i) => {
          const km = distanceKm(g, answer);
          const win = g.name === answer.name;
          return (
            <div key={i} className="guess-row city-row">
              <span className="gname">{g.name}</span>
              <span className="proximity">
                <span className="bar" style={{ width: `${proximityPct(km)}%`, background: proximityColor(km) }} />
                <span className="pct">{win ? '100%' : `${proximityPct(km)}%`}</span>
              </span>
              <span className="dist">{win ? '🎉' : `${formatKm(km)} ${directionArrow(g, answer)}`}</span>
            </div>
          );
        })}
      </div>

      {over && (
        <div className="round-end">
          <p className={solved ? 'result win' : 'result lose'}>
            {solved ? `Solved in ${guesses.length}! 🎉` : `It was ${answer.name}.`}
          </p>
          <p className="hint">{answer.name} · population {answer.pop.toLocaleString()}</p>
          <button className="primary big" onClick={onNext}>▶ Next city in {country.name}</button>
        </div>
      )}
    </div>
  );
}
