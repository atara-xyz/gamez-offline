// Shared geography math — the primitives every game is built from.

export interface LatLng {
  lat: number;
  lng: number;
}

const R = 6371; // Earth radius km
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Great-circle distance in km between two points. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Initial bearing in degrees (0 = north, clockwise). */
export function bearing(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

const ARROWS = ['⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️'];

/** Compass arrow emoji pointing from `from` toward `to`. */
export function directionArrow(from: LatLng, to: LatLng): string {
  const idx = Math.round(bearing(from, to) / 45) % 8;
  return ARROWS[idx];
}

const MAX_DISTANCE = 20000; // ~half Earth's circumference (km)

/** 0..100 proximity score — 100 = exact, 0 = antipodal. */
export function proximityPct(km: number): number {
  return Math.max(0, Math.round((1 - km / MAX_DISTANCE) * 100));
}

/** A cold→hot color for a distance, Globle-style (close = hot red). */
export function proximityColor(km: number): string {
  const t = Math.max(0, Math.min(1, 1 - km / 12000)); // 0 far .. 1 close
  // interpolate hue from 220 (blue, far) to 0 (red, close)
  const hue = 220 - t * 220;
  const light = 70 - t * 35;
  return `hsl(${hue}, 85%, ${light}%)`;
}

/** Squares for the shareable result grid (Wordle-style), green = solved. */
export function proximitySquare(km: number, solved: boolean): string {
  if (solved) return '🟩';
  if (km < 500) return '🟧';
  if (km < 1500) return '🟨';
  if (km < 4000) return '🟦';
  return '⬜';
}

export function formatKm(km: number, miles = false): string {
  const v = miles ? km * 0.621371 : km;
  return `${Math.round(v).toLocaleString()} ${miles ? 'mi' : 'km'}`;
}
