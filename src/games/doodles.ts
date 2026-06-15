// Doodle templates for Sketch It. Each is one or more strokes; a stroke is a list
// of [x,y] points in a 0..100 box. Kept simple/iconic so they're drawable and
// auto-gradable. Smooth curves are approximated by enough points.
export interface Doodle {
  name: string;
  emoji: string;
  strokes: [number, number][][];
}

// helper: circle/ellipse as a polyline
function ellipse(cx: number, cy: number, rx: number, ry: number, n = 28): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}
const circle = (cx: number, cy: number, r: number, n = 28) => ellipse(cx, cy, r, r, n);

export const DOODLES: Doodle[] = [
  { name: 'Circle', emoji: '⭕', strokes: [circle(50, 50, 34)] },
  { name: 'Square', emoji: '⬜', strokes: [[[20, 20], [80, 20], [80, 80], [20, 80], [20, 20]]] },
  { name: 'Triangle', emoji: '🔺', strokes: [[[50, 16], [84, 80], [16, 80], [50, 16]]] },
  { name: 'Star', emoji: '⭐', strokes: [[
    [50, 12], [61, 40], [90, 40], [66, 58], [76, 86], [50, 68], [24, 86], [34, 58], [10, 40], [39, 40], [50, 12],
  ]] },
  { name: 'Heart', emoji: '❤️', strokes: [[
    [50, 82], [22, 54], [22, 34], [36, 24], [50, 34], [64, 24], [78, 34], [78, 54], [50, 82],
  ]] },
  { name: 'House', emoji: '🏠', strokes: [
    [[24, 84], [24, 48], [76, 48], [76, 84], [24, 84]],
    [[16, 50], [50, 22], [84, 50]],
    [[44, 84], [44, 64], [58, 64], [58, 84]],
  ] },
  { name: 'Sun', emoji: '☀️', strokes: [
    circle(50, 50, 20),
    [[50, 6], [50, 22]], [[50, 78], [50, 94]], [[6, 50], [22, 50]], [[78, 50], [94, 50]],
    [[19, 19], [30, 30]], [[70, 70], [81, 81]], [[81, 19], [70, 30]], [[30, 70], [19, 81]],
  ] },
  { name: 'Tree', emoji: '🌳', strokes: [
    [[44, 92], [44, 64], [56, 64], [56, 92]],
    [...circle(50, 42, 26, 24)],
  ] },
  { name: 'Fish', emoji: '🐟', strokes: [
    [[18, 50], [42, 30], [72, 30], [86, 50], [72, 70], [42, 70], [18, 50]],
    [[86, 50], [98, 36], [98, 64], [86, 50]],
    [[40, 44], [44, 44]],
  ] },
  { name: 'Smiley', emoji: '🙂', strokes: [
    circle(50, 50, 36),
    [[38, 42], [38, 46]], [[62, 42], [62, 46]],
    [[34, 62], [42, 70], [58, 70], [66, 62]],
  ] },
  { name: 'Flower', emoji: '🌸', strokes: [
    circle(50, 50, 9, 14),
    ...[0, 1, 2, 3, 4, 5].map((i) => {
      const a = (i / 6) * Math.PI * 2;
      return ellipse(50 + Math.cos(a) * 22, 50 + Math.sin(a) * 22, 12, 12, 14);
    }),
  ] },
  { name: 'Umbrella', emoji: '☂️', strokes: [
    [[14, 50], [50, 18], [86, 50], [14, 50]],
    [[50, 50], [50, 84], [62, 84]],
  ] },
  { name: 'Boat', emoji: '⛵', strokes: [
    [[18, 66], [82, 66], [70, 84], [30, 84], [18, 66]],
    [[50, 66], [50, 18]],
    [[50, 22], [50, 60], [80, 60], [50, 22]],
  ] },
  { name: 'Cat', emoji: '🐱', strokes: [
    circle(50, 54, 30),
    [[28, 30], [22, 10], [42, 24]],
    [[72, 30], [78, 10], [58, 24]],
    [[40, 50], [40, 54]], [[60, 50], [60, 54]],
    [[44, 64], [50, 68], [56, 64]],
  ] },
  { name: 'Key', emoji: '🔑', strokes: [
    circle(30, 50, 16, 18),
    [[44, 50], [86, 50]], [[78, 50], [78, 62]], [[66, 50], [66, 60]],
  ] },
  { name: 'Lightning', emoji: '⚡', strokes: [[[56, 8], [30, 52], [48, 52], [40, 92], [72, 40], [52, 40], [56, 8]]] },
  { name: 'Moon', emoji: '🌙', strokes: [[
    [60, 14], [40, 24], [34, 50], [40, 76], [60, 86], [46, 66], [44, 50], [46, 34], [60, 14],
  ]] },
  { name: 'Apple', emoji: '🍎', strokes: [
    [[50, 30], [34, 28], [24, 40], [26, 64], [40, 84], [50, 80], [60, 84], [74, 64], [76, 40], [66, 28], [50, 30]],
    [[50, 30], [52, 16], [64, 12]],
  ] },
  { name: 'Arrow', emoji: '➡️', strokes: [[[16, 50], [78, 50]], [[60, 32], [82, 50], [60, 68]]] },
  { name: 'Balloon', emoji: '🎈', strokes: [
    ellipse(50, 40, 26, 30, 26),
    [[50, 70], [50, 92]], [[46, 70], [50, 76], [54, 70]],
  ] },
  { name: 'Bicycle', emoji: '🚲', strokes: [
    circle(26, 66, 16, 20),                 // rear wheel
    circle(74, 66, 16, 20),                 // front wheel
    [[26, 66], [44, 40], [60, 66]],         // frame triangle (lower)
    [[44, 40], [74, 66]],                   // top tube to front hub
    [[44, 40], [40, 30]],                   // seat post
    [[34, 30], [46, 30]],                   // seat
    [[60, 66], [66, 34], [78, 34]],         // fork up to handlebars
  ] },
  { name: 'Car', emoji: '🚗', strokes: [
    [[12, 64], [20, 44], [44, 38], [58, 26], [80, 30], [90, 50], [90, 64], [12, 64]],
    circle(30, 66, 9, 16), circle(72, 66, 9, 16),
    [[46, 38], [50, 56]],                    // door/pillar
  ] },
  { name: 'Rocket', emoji: '🚀', strokes: [
    [[50, 10], [62, 40], [62, 70], [38, 70], [38, 40], [50, 10]],
    [[38, 60], [24, 80], [38, 70]],         // left fin
    [[62, 60], [76, 80], [62, 70]],         // right fin
    circle(50, 40, 7, 12),                  // window
    [[44, 70], [50, 88], [56, 70]],         // flame
  ] },
];

// ---- grading: how well do the user's strokes match the target? -------------
type Pt = { x: number; y: number };
const dist2 = (a: Pt, b: Pt) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

function bbox(pts: Pt[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

// Resample a stroke to roughly one point per `step` units of length.
function densify(stroke: Pt[], step = 2): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < stroke.length - 1; i++) {
    const a = stroke[i], b = stroke[i + 1];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.round(d / step));
    for (let k = 0; k < n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  if (stroke.length) out.push(stroke[stroke.length - 1]);
  return out;
}

/**
 * Score a drawing 0..100 vs a doodle. The user's points are normalized (uniform
 * scale + center) into the template's bounding box so position/size don't matter —
 * only the shape. Combines coverage (did you draw all of it?) and precision (is your
 * ink on the shape, not scribble?) as an F1 score. Returns 0 if too little ink.
 */
function pathLen(strokes: Pt[][]): number {
  let L = 0;
  for (const s of strokes) for (let i = 1; i < s.length; i++) L += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y);
  return L;
}

export function scoreDrawing(userStrokes: Pt[][], doodle: Doodle): number {
  const userDense = userStrokes.map((s) => densify(s));
  const userPts = userDense.flat();
  if (userPts.length < 12) return 0;

  const target = doodle.strokes.map((s) => s.map(([x, y]) => ({ x, y })));
  const targetPts = target.flatMap((s) => densify(s));
  const tb = bbox(targetPts);
  const ub = bbox(userPts);
  if (ub.w < 4 && ub.h < 4) return 0;

  // uniform scale to match the larger template dimension, then center-align
  const scale = Math.max(tb.w, tb.h) / Math.max(ub.w, ub.h, 1);
  const ucx = (ub.minX + ub.maxX) / 2, ucy = (ub.minY + ub.maxY) / 2;
  const tcx = (tb.minX + tb.maxX) / 2, tcy = (tb.minY + tb.maxY) / 2;
  const norm = userPts.map((p) => ({ x: (p.x - ucx) * scale + tcx, y: (p.y - ucy) * scale + tcy }));

  const R2 = 6 ** 2; // tighter "near" radius (in the 100-box) squared
  const near = (p: Pt, set: Pt[]) => set.some((q) => dist2(p, q) < R2);

  const sampleT = targetPts.filter((_, i) => i % 2 === 0);
  const sampleU = norm.filter((_, i) => i % 2 === 0);
  const coverage = sampleT.filter((p) => near(p, sampleU)).length / sampleT.length;
  const precision = sampleU.filter((p) => near(p, sampleT)).length / sampleU.length;
  let f1 = coverage + precision === 0 ? 0 : (2 * coverage * precision) / (coverage + precision);

  // Neatness penalty: a scribble packs far more ink length than the target. Scale
  // user length into target space and penalize being much longer than expected.
  const userLenNorm = pathLen(userDense) * scale;
  const targetLen = pathLen(target);
  const overdraw = userLenNorm / Math.max(1, targetLen);
  if (overdraw > 1.4) f1 *= Math.max(0.25, 1.4 / overdraw); // too much ink → docked

  return Math.round(Math.max(0, Math.min(1, f1)) * 100);
}
