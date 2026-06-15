// Reusable UI shared across all games.
import { useEffect, useMemo, useRef, useState } from 'react';
import { mulberry32 } from './random';
import {
  type Country,
  CITIES,
  byId,
  matchCountry,
  suggestCountries,
} from './data';
import {
  directionArrow,
  formatKm,
  proximityColor,
  proximityPct,
  type LatLng,
} from './geo';

export interface Guess {
  country: Country;
  km: number;
  solved: boolean;
}

/** Real SVG flag (Windows/Chrome don't render flag emoji). */
export function Flag({ cca2, className = '' }: { cca2: string; className?: string }) {
  const base = import.meta.env.BASE_URL;
  return (
    <img
      className={`flag-img ${className}`}
      src={`${base}flags/${cca2.toLowerCase()}.svg`}
      alt={cca2}
      loading="lazy"
      onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')}
    />
  );
}

/** Typed country guess with autocomplete. */
export function CountryGuessInput({
  onGuess,
  disabled,
  placeholder = 'Type a country…',
  hideFlags = false,
}: {
  onGuess: (c: Country) => void;
  disabled?: boolean;
  placeholder?: string;
  hideFlags?: boolean;
}) {
  const [text, setText] = useState('');
  const [active, setActive] = useState(0);
  const sugg = suggestCountries(text);

  function submit(c?: Country) {
    const chosen = c ?? (sugg[active] || matchCountry(text));
    if (!chosen) return;
    onGuess(chosen);
    setText('');
    setActive(0);
  }

  return (
    <div className="guess-input">
      <input
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(e) => {
          setText(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          else if (e.key === 'ArrowDown')
            setActive((a) => Math.min(a + 1, sugg.length - 1));
          else if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0));
        }}
      />
      <button className="primary" disabled={disabled} onClick={() => submit()}>
        Guess
      </button>
      {sugg.length > 0 && text && (
        <ul className="suggest">
          {sugg.map((c, i) => (
            <li
              key={c.id}
              className={i === active ? 'on' : ''}
              onMouseDown={(e) => {
                e.preventDefault();
                submit(c);
              }}
            >
              {!hideFlags && <Flag cca2={c.cca2} />} {c.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * List of past guesses with distance, optional direction arrow, proximity bar.
 * `target` + `showDirection` enable the compass arrow (gated by difficulty).
 */
export function GuessList({
  guesses,
  target,
  showDirection = false,
  showProximity = true,
  hideFlags = false,
}: {
  guesses: Guess[];
  target?: LatLng;
  showDirection?: boolean;
  showProximity?: boolean;
  hideFlags?: boolean;
}) {
  const [miles, setMiles] = useState(false);
  return (
    <div className="guesses">
      {/* Distance is proximity help, so it's hidden whenever proximity is off
          (Hard mode = "no help"); the km/mi toggle goes with it. */}
      {guesses.length > 0 && showProximity && (
        <button className="unit-toggle" onClick={() => setMiles((m) => !m)}>
          {miles ? 'mi' : 'km'}
        </button>
      )}
      {guesses.map((g, i) => (
        <div key={i} className={`guess-row${hideFlags ? ' city-row' : ''}`}>
          {!hideFlags && <Flag cca2={g.country.cca2} />}
          <span className="gname">{g.country.name}</span>
          {showProximity ? (
            <span className="proximity">
              <span
                className="bar"
                style={{
                  width: `${proximityPct(g.km)}%`,
                  background: proximityColor(g.km),
                }}
              />
              <span className="pct">{g.solved ? '100%' : `${proximityPct(g.km)}%`}</span>
            </span>
          ) : (
            <span />
          )}
          <span className="dist">
            {g.solved
              ? '🎉'
              : showProximity && (
                  <>
                    {formatKm(g.km, miles)}
                    {showDirection && target && (
                      <span className="arrow"> {directionArrow(g.country, target)}</span>
                    )}
                  </>
                )}
          </span>
        </div>
      ))}
    </div>
  );
}

/** The post-round learning card — the teaching moment. */
export function FactCard({
  country,
  onExploreCities,
}: {
  country: Country;
  onExploreCities?: (c: Country) => void;
}) {
  const neighbors = country.borders
    .map((b) => byId.get(b)?.name)
    .filter(Boolean) as string[];
  const cityCount = CITIES[country.id]?.length ?? 0;
  return (
    <div className="fact-card">
      <Flag cca2={country.cca2} className="fact-flag" />
      <h2>{country.name}</h2>
      <dl>
        <div>
          <dt>Capital</dt>
          <dd>{country.capital ?? '—'}</dd>
        </div>
        <div>
          <dt>Region</dt>
          <dd>{country.subregion || country.region}</dd>
        </div>
        <div>
          <dt>Population</dt>
          <dd>{country.population.toLocaleString()}</dd>
        </div>
        {country.area != null && (
          <div>
            <dt>Area</dt>
            <dd>{country.area.toLocaleString()} km²</dd>
          </div>
        )}
        <div>
          <dt>Neighbors</dt>
          <dd>{neighbors.length ? neighbors.join(', ') : 'None (island/coastal)'}</dd>
        </div>
      </dl>
      {onExploreCities && cityCount > 1 && (
        <button className="primary big" onClick={() => onExploreCities(country)}>
          🏙️ Explore the cities of {country.name}
        </button>
      )}
    </div>
  );
}

/**
 * Global UX: once a round is over (the "Next" button is showing), pressing Enter
 * advances to the next round. So the flow is: type → Enter (guess) → Enter (next).
 * Only listens while `active` is true, so the Enter that *submitted* the winning
 * guess can't also trigger the advance.
 */
export function useEnterToAdvance(active: boolean, onAdvance: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onAdvance();
      }
    };
    // Attach on the next tick so the keyup/keydown that ended the round is done.
    const id = setTimeout(() => window.addEventListener('keydown', onKey), 0);
    return () => {
      clearTimeout(id);
      window.removeEventListener('keydown', onKey);
    };
  }, [active, onAdvance]);
}

/**
 * Pick a round's answer from a pool while AVOIDING the last few answers, so you
 * don't get the same country/flag/word twice (or thrice) in a row. Drop-in for the
 * common `useMemo(() => pick(pool, rng), [pool, round, seed])` pattern.
 *  - `salt` keeps different games on the same pool independent in seeded mode.
 *  - `key` identifies items (defaults to JSON/string).
 */
export function useRoundPick<T>(
  pool: T[],
  round: number,
  opts: { seed?: number; salt?: number; key?: (t: T) => string; history?: number } = {},
): T {
  const { seed, salt = 0, key = (t) => String(t), history = 5 } = opts;
  const recent = useRef<string[]>([]);
  const answer = useMemo(() => {
    if (pool.length <= 1) return pool[0];
    const rng = seed != null ? mulberry32(seed + round + salt) : Math.random;
    let choice = pool[Math.floor(rng() * pool.length)];
    for (let i = 0; i < 40 && recent.current.includes(key(choice)); i++) {
      choice = pool[Math.floor(rng() * pool.length)];
    }
    return choice;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, round, seed, salt]);
  // Record after commit (StrictMode-safe via dedup) so the NEXT round avoids this one.
  useEffect(() => {
    const k = key(answer);
    if (recent.current[recent.current.length - 1] === k) return;
    recent.current.push(k);
    const cap = Math.min(history, Math.max(0, pool.length - 1));
    while (recent.current.length > cap) recent.current.shift();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer]);
  return answer;
}

/** Auto-focus helper for inputs when a round starts. */
export function useAutoFocus(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const input = ref.current?.querySelector('input');
    input?.focus();
  }, [dep]);
  return ref;
}
