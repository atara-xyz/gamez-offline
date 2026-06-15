// Shared pieces for the NBA games.
import { useState } from 'react';
import { type NbaTeam, suggestTeams, matchTeam } from '../data';

export function TeamLogo({ team, className = '' }: { team: NbaTeam; className?: string }) {
  return (
    <img
      className={`team-logo ${className}`}
      src={import.meta.env.BASE_URL + team.logo}
      alt={team.full}
      loading="eager"
    />
  );
}

/** Autocomplete input for NBA teams. `exclude` hides already-used teams. */
export function TeamGuessInput({
  onGuess,
  exclude,
  placeholder = 'Type a team or city…',
  autoFocus,
}: {
  onGuess: (t: NbaTeam) => void;
  exclude?: Set<string>;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState('');
  const [active, setActive] = useState(0);
  const sugg = suggestTeams(text, exclude);

  function submit(t?: NbaTeam) {
    const chosen = t ?? sugg[active] ?? matchTeam(text);
    if (!chosen) return;
    onGuess(chosen);
    setText('');
    setActive(0);
  }

  return (
    <div className="guess-input">
      <input
        value={text}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        autoFocus={autoFocus}
        onChange={(e) => { setText(e.target.value); setActive(0); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          else if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, sugg.length - 1));
          else if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0));
        }}
      />
      <button className="primary" onClick={() => submit()}>Guess</button>
      {sugg.length > 0 && text && (
        <ul className="suggest">
          {sugg.map((t, i) => (
            <li key={t.id} className={i === active ? 'on' : ''}
              onMouseDown={(e) => { e.preventDefault(); submit(t); }}>
              <TeamLogo team={t} className="mini" /> {t.full}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TeamFactCard({ team }: { team: NbaTeam }) {
  return (
    <div className="fact-card team-card" style={{ borderColor: team.colors[0] }}>
      <div className="team-card-head" style={{ background: `linear-gradient(120deg, ${team.colors[0]}, ${team.colors[1]})` }}>
        <TeamLogo team={team} className="big" />
      </div>
      <h2>{team.full}</h2>
      <dl>
        <div><dt>Conference</dt><dd>{team.conf}</dd></div>
        <div><dt>Division</dt><dd>{team.div}</dd></div>
        <div><dt>Founded</dt><dd>{team.founded}</dd></div>
        <div><dt>Championships</dt><dd>{team.titles}</dd></div>
      </dl>
    </div>
  );
}
