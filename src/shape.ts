// Runtime helpers for rendering country shapes and placing points inside them.
import { geoMercator } from 'd3-geo';
import { CITYSHAPES, type Shape } from './data';

type Projector = (lat: number, lng: number) => { x: number; y: number };

function projectorFor(shape: Shape | undefined): Projector | null {
  if (!shape) return null;
  const proj = geoMercator().scale(shape.k).translate(shape.t);
  return (lat, lng) => {
    const p = proj([lng, lat]);
    return { x: p?.[0] ?? 50, y: p?.[1] ?? 50 };
  };
}

/**
 * Projector for the Cities deep-dive: rebuilds the mercator projection used to
 * bake the country's *city map* (framed on its cities), so city lat/lng land on
 * the rendered outline.
 */
export function cityProjector(countryId: string): Projector | null {
  return projectorFor(CITYSHAPES[countryId]);
}

/** Outline path for the Cities deep-dive map. */
export function cityShapePath(countryId: string): string | undefined {
  return CITYSHAPES[countryId]?.d;
}
