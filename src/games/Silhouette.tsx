// Worldle-style country silhouette (the shape to identify).
import { SILHOUETTES } from '../data';
import type { Country } from '../data';

export function Silhouette({ country }: { country: Country }) {
  const shape = SILHOUETTES[country.id];
  return (
    <svg className="silhouette" viewBox="0 0 100 100" role="img" aria-label="Country shape">
      <defs>
        <filter id="neon" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {shape && (
        <path
          d={shape.d}
          fill="#0bd3ff"
          stroke="#7df9ff"
          strokeWidth={0.5}
          filter="url(#neon)"
        />
      )}
    </svg>
  );
}
