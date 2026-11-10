/**
 * Shared geometry engine for the interactive bicycle drawings.
 *
 * Each bicycle profile describes its frame in millimetres (bottom bracket at the
 * origin, y pointing up) and converts landmarks to SVG user units with one
 * shared scale, so the five drawings are directly comparable.
 */

export type Pt = { readonly x: number; readonly y: number };

export const P = (x: number, y: number): Pt => ({ x, y });
export const add = (a: Pt, b: Pt): Pt => P(a.x + b.x, a.y + b.y);
export const sub = (a: Pt, b: Pt): Pt => P(a.x - b.x, a.y - b.y);
export const mul = (a: Pt, k: number): Pt => P(a.x * k, a.y * k);
export const dot = (a: Pt, b: Pt): number => a.x * b.x + a.y * b.y;
export const len = (a: Pt): number => Math.hypot(a.x, a.y);
export const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);
export const norm = (a: Pt): Pt => {
  const l = len(a);
  return l === 0 ? P(0, 0) : P(a.x / l, a.y / l);
};
export const lerp = (a: Pt, b: Pt, t: number): Pt => P(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
/** Rotate 90° counter-clockwise in a y-up frame (clockwise on screen in SVG space). */
export const perp = (a: Pt): Pt => P(-a.y, a.x);
export const rad = (degrees: number): number => (degrees * Math.PI) / 180;
export const deg = (radians: number): number => (radians * 180) / Math.PI;
export const dir = (degrees: number): Pt => P(Math.cos(rad(degrees)), Math.sin(rad(degrees)));
export const polar = (c: Pt, r: number, degrees: number): Pt => add(c, mul(dir(degrees), r));
export const angleOf = (v: Pt): number => deg(Math.atan2(v.y, v.x));
export const rotate = (v: Pt, degrees: number): Pt => {
  const c = Math.cos(rad(degrees));
  const s = Math.sin(rad(degrees));
  return P(v.x * c - v.y * s, v.x * s + v.y * c);
};
export const along = (from: Pt, to: Pt, distance: number): Pt => add(from, mul(norm(sub(to, from)), distance));
export const round = (n: number): number => Math.round(n * 100) / 100;
export const fmt = (p: Pt): string => `${round(p.x)} ${round(p.y)}`;

/** Shared drawing scale (SVG units per millimetre) used by all five bicycles. */
export const DRAW_SCALE = 0.41;
export const VIEW_WIDTH = 1000;
export const VIEW_HEIGHT = 540;
/** Ground plane (tire contact patches) in SVG units. */
export const GROUND_Y = 505;

export type Transform = {
  /** Convert a y-up millimetre point to SVG coordinates. */
  p: (pt: Pt) => Pt;
  /** Convert a millimetre length to SVG units. */
  l: (mm: number) => number;
};

/**
 * Builds the mm → SVG transform for one bicycle: ground on GROUND_Y and the
 * wheel extents centred horizontally in the shared view box.
 */
export function makeTransform(groundMm: number, minXmm: number, maxXmm: number): Transform {
  const centreX = (minXmm + maxXmm) / 2;
  return {
    p: (q) => P(VIEW_WIDTH / 2 + (q.x - centreX) * DRAW_SCALE, GROUND_Y - (q.y - groundMm) * DRAW_SCALE),
    l: (mm) => mm * DRAW_SCALE,
  };
}

/** Pitch radius (mm) of a sprocket with the given tooth count on a ½-inch-pitch chain. */
export const pitchRadius = (teeth: number): number => 12.7 / (2 * Math.sin(Math.PI / teeth));

export type FrameInput = {
  stack: number;
  reach: number;
  headAngle: number;
  seatAngle: number;
  headTube: number;
  bbDrop: number;
  chainstay: number;
  forkOffset: number;
  /** Bead-seat radius plus tire height (mm). */
  wheelRadius: number;
  seatTube: number;
  topTubeJoin: number;
  seatStayJoin: number;
  saddleHeight: number;
  topTubeBelowHeadTop: number;
  downTubeAboveHeadBottom: number;
  spacers: number;
  stemLength: number;
  stemAngle: number;
};

export type FrameLandmarks = {
  bb: Pt;
  rearAxle: Pt;
  frontAxle: Pt;
  headTop: Pt;
  headBottom: Pt;
  steeringUp: Pt;
  steeringDown: Pt;
  seatUp: Pt;
  topTubeFront: Pt;
  downTubeFront: Pt;
  seatCluster: Pt;
  topTubeRear: Pt;
  seatStayTop: Pt;
  saddleTop: Pt;
  steererTop: Pt;
  barClamp: Pt;
  groundY: number;
  wheelbase: number;
  frontCentre: number;
  rearCentre: number;
};

/**
 * Solves a side-elevation frame from stack/reach style inputs. The front axle
 * position is derived from the steering axis and fork offset, so wheelbase is
 * an output that can be checked against published figures.
 */
export function solveFrame(f: FrameInput): FrameLandmarks {
  const ha = rad(f.headAngle);
  const rearCentre = Math.sqrt(f.chainstay ** 2 - f.bbDrop ** 2);
  const headTop = P(f.reach, f.stack);
  const steeringDown = P(Math.cos(ha), -Math.sin(ha));
  const steeringUp = mul(steeringDown, -1);
  const frontCentre = f.reach + (f.stack - f.bbDrop) / Math.tan(ha) + f.forkOffset / Math.sin(ha);
  const headBottom = add(headTop, mul(steeringDown, f.headTube));
  const seatUp = P(-Math.cos(rad(f.seatAngle)), Math.sin(rad(f.seatAngle)));
  const steererTop = add(headTop, mul(steeringUp, f.spacers + 20));
  const stemDir = rotate(P(Math.sin(ha), Math.cos(ha)), f.stemAngle);
  return {
    bb: P(0, 0),
    rearAxle: P(-rearCentre, f.bbDrop),
    frontAxle: P(frontCentre, f.bbDrop),
    headTop,
    headBottom,
    steeringUp,
    steeringDown,
    seatUp,
    topTubeFront: add(headTop, mul(steeringDown, f.topTubeBelowHeadTop)),
    downTubeFront: add(headBottom, mul(steeringUp, f.downTubeAboveHeadBottom)),
    seatCluster: mul(seatUp, f.seatTube),
    topTubeRear: mul(seatUp, f.topTubeJoin),
    seatStayTop: mul(seatUp, f.seatStayJoin),
    saddleTop: mul(seatUp, f.saddleHeight),
    steererTop,
    barClamp: add(steererTop, mul(stemDir, f.stemLength)),
    groundY: f.bbDrop - f.wheelRadius,
    wheelbase: frontCentre + rearCentre,
    frontCentre,
    rearCentre,
  };
}

/* ------------------------------------------------------------------ */
/* Chain loop                                                          */
/* ------------------------------------------------------------------ */

/** A sprocket or pulley in chain-travel order. `clockwise` refers to the drive-side view. */
export type ChainWheel = { name: string; c: Pt; r: number; clockwise: boolean };
export type ChainSegment = { from: string; to: string; start: Pt; end: Pt };
export type ChainLoop = { wheels: ChainWheel[]; segments: ChainSegment[]; length: number };

/**
 * Computes the tangent segments of a closed chain loop (y-up mm coordinates).
 * For a wheel travelled clockwise the centre lies to the right of the chain's
 * travel direction; the signed-radius tangent solution follows from that.
 */
export function solveChainLoop(wheels: ChainWheel[]): ChainLoop {
  const segments: ChainSegment[] = wheels.map((w1, i) => {
    const w2 = wheels[(i + 1) % wheels.length];
    const s1 = w1.clockwise ? w1.r : -w1.r;
    const s2 = w2.clockwise ? w2.r : -w2.r;
    const d = sub(w2.c, w1.c);
    const ratio = (s2 - s1) / len(d);
    if (Math.abs(ratio) >= 1) throw new Error(`Chain wheels ${w1.name} and ${w2.name} overlap`);
    const alpha = Math.atan2(d.y, d.x) + Math.asin(ratio);
    const right = P(Math.sin(alpha), -Math.cos(alpha));
    return { from: w1.name, to: w2.name, start: sub(w1.c, mul(right, s1)), end: sub(w2.c, mul(right, s2)) };
  });
  let length = segments.reduce((sum, s) => sum + dist(s.start, s.end), 0);
  wheels.forEach((w, i) => {
    const arrive = segments[(i - 1 + wheels.length) % wheels.length].end;
    length += w.r * wrapAngle(w, arrive, segments[i].start);
  });
  return { wheels, segments, length };
}

/** Angle (radians) of chain wrap on a wheel from arrival to departure, in travel direction. */
export function wrapAngle(w: ChainWheel, arrive: Pt, depart: Pt): number {
  const a = Math.atan2(arrive.y - w.c.y, arrive.x - w.c.x);
  const b = Math.atan2(depart.y - w.c.y, depart.x - w.c.x);
  const tau = Math.PI * 2;
  const raw = w.clockwise ? a - b : b - a;
  return ((raw % tau) + tau) % tau;
}

/** SVG path for a solved chain loop. */
export function chainPath(loop: ChainLoop, t: Transform): string {
  const n = loop.wheels.length;
  let d = `M ${fmt(t.p(loop.segments[0].start))}`;
  for (let i = 0; i < n; i += 1) {
    const seg = loop.segments[i];
    const w = loop.wheels[(i + 1) % n];
    const next = loop.segments[(i + 1) % n];
    const wrap = wrapAngle(w, seg.end, next.start);
    const r = round(t.l(w.r));
    d += ` L ${fmt(t.p(seg.end))} A ${r} ${r} 0 ${wrap > Math.PI ? 1 : 0} ${w.clockwise ? 1 : 0} ${fmt(t.p(next.start))}`;
  }
  return `${d} Z`;
}

/* ------------------------------------------------------------------ */
/* Hit regions                                                         */
/* ------------------------------------------------------------------ */

export type HitShape =
  | { kind: "stroke"; points: Pt[]; width: number }
  | { kind: "circle"; c: Pt; r: number }
  | { kind: "ring"; c: Pt; r: number; width: number }
  | { kind: "polygon"; points: Pt[] };

export type PartRegion = {
  /** Canonical component ID from src/data/components/catalog.ts. */
  id: string;
  hit: HitShape[];
  /** Optional selection halo shapes; defaults to the hit shapes. */
  halo?: HitShape[];
  /** A point on the visible part that must resolve to this part when hit-tested. */
  anchor: Pt;
};

export const strokeHit = (points: Pt[], width: number): HitShape => ({ kind: "stroke", points, width });
export const circleHit = (c: Pt, r: number): HitShape => ({ kind: "circle", c, r });
export const ringHit = (c: Pt, r: number, width: number): HitShape => ({ kind: "ring", c, r, width });
export const polygonHit = (points: Pt[]): HitShape => ({ kind: "polygon", points });

function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2));
  return dist(p, add(a, mul(ab, t)));
}

function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const a = poly[i];
    const b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function shapeContains(shape: HitShape, p: Pt): boolean {
  switch (shape.kind) {
    case "circle":
      return dist(shape.c, p) <= shape.r;
    case "ring":
      return Math.abs(dist(shape.c, p) - shape.r) <= shape.width / 2;
    case "polygon":
      return pointInPolygon(p, shape.points);
    case "stroke":
      for (let i = 0; i < shape.points.length - 1; i += 1) {
        if (distToSegment(p, shape.points[i], shape.points[i + 1]) <= shape.width / 2) return true;
      }
      return false;
  }
}

/** Returns the topmost part (last in paint order) whose hit shapes contain the point. */
export function hitTest(parts: PartRegion[], p: Pt): string | undefined {
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    if (parts[i].hit.some((shape) => shapeContains(shape, p))) return parts[i].id;
  }
  return undefined;
}

/**
 * Paint order of the transparent hit layer (first = bottom). Small parts sit
 * above large ones so a precise click reaches them; wheels are the fallback.
 */
export const HIT_PRIORITY = [
  "rear-wheel",
  "front-wheel",
  "frame",
  "rear-suspension",
  "battery",
  "fork",
  "seatpost",
  "saddle",
  "stem",
  "handlebars",
  "shifters",
  "motor",
  "crankset",
  "chain",
  "cassette",
  "rear-derailleur",
  "pedals",
  "rear-brake",
  "front-brake",
] as const;

export function orderParts(parts: PartRegion[]): PartRegion[] {
  const rank = (id: string) => {
    const index = (HIT_PRIORITY as readonly string[]).indexOf(id);
    if (index < 0) throw new Error(`Unknown interactive part ${id}`);
    return index;
  };
  return [...parts].sort((a, b) => rank(a.id) - rank(b.id));
}

/* ------------------------------------------------------------------ */
/* Shape helpers (SVG space)                                           */
/* ------------------------------------------------------------------ */

/** Closed outline of a tube whose radius tapers from r1 at a to r2 at b. */
export function tubePath(a: Pt, r1: number, b: Pt, r2: number): string {
  const d = dist(a, b);
  const u = norm(sub(b, a));
  const phi = Math.acos(Math.max(-1, Math.min(1, (r1 - r2) / d)));
  const n1 = rotate(u, deg(phi));
  const n2 = rotate(u, -deg(phi));
  const a1 = add(a, mul(n1, r1));
  const b1 = add(b, mul(n1, r2));
  const b2 = add(b, mul(n2, r2));
  const a2 = add(a, mul(n2, r1));
  const largeB = phi > Math.PI / 2 ? 1 : 0;
  const largeA = phi < Math.PI / 2 ? 1 : 0;
  return `M ${fmt(a1)} L ${fmt(b1)} A ${round(r2)} ${round(r2)} 0 ${largeB} 0 ${fmt(b2)} L ${fmt(a2)} A ${round(r1)} ${round(r1)} 0 ${largeA} 0 ${fmt(a1)} Z`;
}

/** Polygon approximating a tapered tube, for hit testing. */
export function tubePolygon(a: Pt, r1: number, b: Pt, r2: number): Pt[] {
  const n = perp(norm(sub(b, a)));
  return [add(a, mul(n, r1)), add(b, mul(n, r2)), add(b, mul(n, -r2)), add(a, mul(n, -r1))];
}

export const polygonPath = (points: Pt[]): string => `M ${points.map(fmt).join(" L ")} Z`;
export const polylinePath = (points: Pt[]): string => `M ${points.map(fmt).join(" L ")}`;

/** Point at a visual angle (degrees, counter-clockwise on screen, 0 = forward) around an SVG-space centre. */
export const svgPolar = (c: Pt, r: number, degrees: number): Pt =>
  P(c.x + r * Math.cos(rad(degrees)), c.y - r * Math.sin(rad(degrees)));

export const circlePoints = (c: Pt, r: number, n = 12): Pt[] =>
  Array.from({ length: n }, (_, i) => svgPolar(c, r, (i * 360) / n));

/** Convex hull (monotone chain); used for padded hit polygons around compact assemblies. */
export function convexHull(points: Pt[]): Pt[] {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length < 3) return pts;
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const build = (list: Pt[]) => {
    const out: Pt[] = [];
    for (const q of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], q) <= 0) out.pop();
      out.push(q);
    }
    return out;
  };
  const lower = build(pts);
  const upper = build([...pts].reverse());
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Hull of circles of radius `pad` around each point. */
export const paddedHull = (points: Pt[], pad: number): Pt[] => convexHull(points.flatMap((q) => circlePoints(q, pad, 10)));

/** Annular sector polygon in SVG space (visual angles, counter-clockwise from forward). */
export function sectorPolygon(c: Pt, rIn: number, rOut: number, fromDeg: number, toDeg: number, steps = 8): Pt[] {
  const outer = Array.from({ length: steps + 1 }, (_, i) => svgPolar(c, rOut, fromDeg + ((toDeg - fromDeg) * i) / steps));
  const inner = Array.from({ length: steps + 1 }, (_, i) => svgPolar(c, rIn, toDeg - ((toDeg - fromDeg) * i) / steps));
  return [...outer, ...inner];
}

/** Smooth Catmull-Rom curve through points, emitted as cubic Béziers. */
export function smoothPath(points: Pt[], closed = true): string {
  const n = points.length;
  const get = (i: number) => (closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))]);
  let d = `M ${fmt(points[0])}`;
  const segments = closed ? n : n - 1;
  for (let i = 0; i < segments; i += 1) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    const c1 = add(p1, mul(sub(p2, p0), 1 / 6));
    const c2 = sub(p2, mul(sub(p3, p1), 1 / 6));
    d += ` C ${fmt(c1)} ${fmt(c2)} ${fmt(p2)}`;
  }
  return closed ? `${d} Z` : d;
}

/** Samples a cubic Bézier (for hit strokes that follow curved parts). */
export function sampleCubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, steps = 10): Pt[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const u = 1 - t;
    return P(
      u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    );
  });
}
