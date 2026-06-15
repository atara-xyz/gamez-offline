// Globle-style world map: colors each guessed country by proximity to the answer.
import { WORLD } from '../data';
import { distanceKm, proximityColor } from '../geo';
import type { Country } from '../data';

export function WorldMap({
  answer,
  guessed,
  reveal,
}: {
  answer: Country;
  guessed: Country[];
  reveal: boolean;
}) {
  const colorFor = (id: string): string => {
    if (reveal && id === answer.id) return '#22c55e';
    const g = guessed.find((c) => c.id === id);
    if (!g) return '#1e293b';
    if (g.id === answer.id) return '#22c55e';
    const km = distanceKm(g, answer);
    return proximityColor(km);
  };
  return (
    <svg
      className="worldmap"
      viewBox={`0 0 ${WORLD.width} ${WORLD.height}`}
      role="img"
      aria-label="World map"
    >
      {Object.entries(WORLD.paths).map(([id, d]) => (
        <path key={id} d={d} fill={colorFor(id)} stroke="#0f172a" strokeWidth={0.3} />
      ))}
    </svg>
  );
}
