// Flagle-style flag clue using a real SVG flag image. Starts blurred and
// sharpens with each guess so early guesses are harder.
import type { Country, Difficulty } from '../data';
import { Flag } from '../ui';

export function FlagReveal({
  country,
  guessCount,
  reveal,
  difficulty,
}: {
  country: Country;
  guessCount: number;
  reveal: boolean;
  difficulty: Difficulty;
}) {
  // Harder difficulty = blurrier start. 6 guesses sharpen it to 0.
  const startBlur = difficulty === 1 ? 8 : difficulty === 2 ? 16 : 26;
  const step = startBlur / 6;
  const blur = reveal ? 0 : Math.max(0, startBlur - guessCount * step);
  return (
    <div className="flag-clue">
      <div className="flag-frame" style={{ filter: `blur(${blur}px)` }}>
        <Flag cca2={country.cca2} className="flag-big" />
      </div>
    </div>
  );
}
