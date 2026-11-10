import type { ReactNode } from "react";
import { P, add, fmt, mul, norm, perp, polygonPath, round, sub, svgPolar, tubePath, tubePolygon, type Pt } from "./geometry";

/** Restrained palette: forest/cream/lime brand colours with neutral component greys. */
export const INK = {
  outline: "#1f3326",
  component: "#2b3a30",
  componentMid: "#3f5045",
  componentLight: "#5b6b60",
  metal: "#a8b3a9",
  metalLight: "#d6dcd3",
  metalDark: "#6d7b70",
  tire: "#2a322c",
  tireEdge: "#141b16",
  tread: "#47524a",
  rim: "#344139",
  rimEdge: "#88958b",
  spokeNear: "#7b887e",
  spokeFar: "#b9c2ba",
  lime: "#d5ed79",
  limeDeep: "#9fbf55",
  cream: "#f7f5ea",
  stanchion: "#d9ddd0",
  accessory: "#4d5d52",
} as const;

export type Tread = "slick" | "knobby" | "gravel" | "commuter" | "trekking";

/* ------------------------------------------------------------------ */
/* Wheel                                                               */
/* ------------------------------------------------------------------ */

type WheelProps = {
  c: Pt;
  outerR: number;
  beadR: number;
  rimDepth: number;
  tread: Tread;
  hubR: number;
  flangeR: number;
  spokeCount?: number;
  radial?: boolean;
  behind?: ReactNode;
  front?: ReactNode;
  feature: string;
};

function spokeLines(c: Pt, flangeR: number, rimInner: number, count: number, far: boolean, radial: boolean) {
  const perSide = count / 2;
  const step = 360 / perSide;
  const cross = radial ? 0 : (2 * 720) / count;
  return Array.from({ length: perSide }, (_, k) => {
    const a = k * step + (far ? step / 2 : 0);
    const e = a + (k % 2 === 0 ? cross : -cross);
    const s = svgPolar(c, flangeR, a);
    const r = svgPolar(c, rimInner, e);
    return <line key={`${far ? "f" : "n"}${k}`} x1={round(s.x)} y1={round(s.y)} x2={round(r.x)} y2={round(r.y)} />;
  });
}

function TreadDetail({ c, outerR, beadR, tread }: { c: Pt; outerR: number; beadR: number; tread: Tread }) {
  const tireW = outerR - beadR;
  if (tread === "knobby") {
    return (
      <g data-feature="knobby-tread" fill={INK.tread} stroke={INK.tireEdge} strokeWidth={0.5}>
        {Array.from({ length: 52 }, (_, i) => {
          const big = i % 2 === 0;
          const a = (i * 360) / 52;
          const w = big ? 4.6 : 3.2;
          const h = big ? 2.6 : 2.2;
          const r = outerR - h / 2 + 0.9;
          const p = svgPolar(c, r, a);
          return <rect key={i} x={round(p.x - w / 2)} y={round(p.y - h / 2)} width={w} height={h} rx={0.8} transform={`rotate(${round(90 - a)} ${round(p.x)} ${round(p.y)})`} />;
        })}
      </g>
    );
  }
  if (tread === "gravel") {
    return (
      <g data-feature="gravel-tread" fill={INK.tread}>
        {Array.from({ length: 76 }, (_, i) => {
          const a = (i * 360) / 76;
          const p = svgPolar(c, outerR - 0.6, a);
          return <rect key={i} x={round(p.x - 1.4)} y={round(p.y - 1.1)} width={2.8} height={2.2} rx={0.5} transform={`rotate(${round(90 - a)} ${round(p.x)} ${round(p.y)})`} />;
        })}
      </g>
    );
  }
  if (tread === "commuter" || tread === "trekking") {
    return (
      <g data-feature={`${tread}-tread`}>
        {tread === "trekking" && <circle data-feature="reflective-sidewall" cx={c.x} cy={c.y} r={round(beadR + tireW * 0.3)} fill="none" stroke="#d4dbd1" strokeWidth={1.3} />}
        <circle cx={c.x} cy={c.y} r={round(outerR - tireW * 0.22)} fill="none" stroke={INK.tread} strokeWidth={1.6} strokeDasharray="3 3.2" />
      </g>
    );
  }
  return <circle data-feature="slick-tread" cx={c.x} cy={c.y} r={round(outerR - tireW * 0.3)} fill="none" stroke="#ffffff" strokeOpacity={0.08} strokeWidth={1.2} />;
}

export function Wheel({ c, outerR, beadR, rimDepth, tread, hubR, flangeR, spokeCount = 24, radial = false, behind, front, feature }: WheelProps) {
  const rimInner = beadR - rimDepth;
  const tireW = outerR - beadR;
  return (
    <g data-feature={feature} data-lacing={radial ? "radial" : "crossed"}>
      {behind}
      <g stroke={INK.spokeFar} strokeWidth={0.75}>{spokeLines(c, flangeR, rimInner, spokeCount, true, radial)}</g>
      <circle cx={c.x} cy={c.y} r={round(beadR - rimDepth / 2)} fill="none" stroke={INK.rim} strokeWidth={round(rimDepth)} />
      <circle cx={c.x} cy={c.y} r={round(beadR - 0.8)} fill="none" stroke={INK.rimEdge} strokeWidth={0.9} />
      <circle cx={c.x} cy={c.y} r={round(rimInner)} fill="none" stroke={INK.rimEdge} strokeWidth={0.6} />
      <g stroke={INK.spokeNear} strokeWidth={0.95}>{spokeLines(c, flangeR, rimInner, spokeCount, false, radial)}</g>
      <circle cx={c.x} cy={c.y} r={round(flangeR + 0.8)} fill="none" stroke={INK.metalDark} strokeWidth={1.6} />
      <circle cx={c.x} cy={c.y} r={round(hubR)} fill={INK.component} stroke={INK.metal} strokeWidth={1.2} />
      {front}
      <circle cx={c.x} cy={c.y} r={round(beadR + tireW / 2)} fill="none" stroke={INK.tire} strokeWidth={round(tireW)} />
      <circle cx={c.x} cy={c.y} r={round(outerR - 0.5)} fill="none" stroke={INK.tireEdge} strokeWidth={1.1} />
      <circle cx={c.x} cy={c.y} r={round(beadR + 0.4)} fill="none" stroke={INK.tireEdge} strokeWidth={0.8} />
      <TreadDetail c={c} outerR={outerR} beadR={beadR} tread={tread} />
      <circle cx={c.x} cy={c.y} r={round(hubR * 0.42)} fill={INK.metalLight} stroke={INK.component} strokeWidth={0.8} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Brakes                                                              */
/* ------------------------------------------------------------------ */

export function DiscRotor({ c, r }: { c: Pt; r: number }) {
  const track = r * 0.2;
  const mid = r - track / 2;
  return (
    <g data-feature="disc-rotor">
      {Array.from({ length: 6 }, (_, k) => {
        const a = k * 60 + 18;
        const s = svgPolar(c, r * 0.22, a);
        const e = svgPolar(c, r - track * 0.8, a + 14);
        return <line key={k} x1={round(s.x)} y1={round(s.y)} x2={round(e.x)} y2={round(e.y)} stroke={INK.metalDark} strokeWidth={round(r * 0.08)} strokeLinecap="round" />;
      })}
      <circle cx={c.x} cy={c.y} r={round(mid)} fill="none" stroke={INK.metal} strokeWidth={round(track)} />
      <circle cx={c.x} cy={c.y} r={round(mid)} fill="none" stroke={INK.metalDark} strokeWidth={round(track * 0.32)} strokeDasharray="1.4 2.6" />
      <circle cx={c.x} cy={c.y} r={round(r)} fill="none" stroke={INK.metalDark} strokeWidth={0.7} />
      <circle cx={c.x} cy={c.y} r={round(r * 0.24)} fill={INK.metalDark} stroke={INK.component} strokeWidth={0.8} />
    </g>
  );
}

export type CaliperKind = "flat-mount" | "post-mount" | "four-piston";

/** A disc caliper straddling the rotor edge at `c`, oriented tangentially to the rotor. */
export function BrakeCaliper({ c, hub, mount, length, depth, kind }: { c: Pt; hub: Pt; mount: Pt; length: number; depth: number; kind: CaliperKind }) {
  const radial = norm(sub(c, hub));
  const angle = (Math.atan2(radial.y, radial.x) * 180) / Math.PI + 90;
  const hose = add(c, mul(radial, depth * 0.9));
  return (
    <g data-feature={`${kind}-caliper`}>
      <path d={tubePath(c, depth * 0.32, mount, depth * 0.28)} fill={INK.componentMid} stroke={INK.outline} strokeWidth={0.8} />
      <g transform={`translate(${round(c.x)} ${round(c.y)}) rotate(${round(angle)})`}>
        <rect x={round(-length / 2)} y={round(-depth / 2)} width={round(length)} height={round(depth)} rx={round(depth * 0.36)} fill={INK.component} stroke={INK.outline} strokeWidth={1} />
        <rect x={round(-length / 2 + 2)} y={round(-depth / 2 + 1.6)} width={round(length - 4)} height={round(depth * 0.3)} rx={1.2} fill={INK.componentLight} />
        {kind === "four-piston" && <line x1={0} y1={round(-depth / 2)} x2={0} y2={round(depth / 2)} stroke={INK.outline} strokeWidth={0.8} />}
      </g>
      <circle cx={round(hose.x)} cy={round(hose.y)} r={round(depth * 0.18)} fill={INK.metal} stroke={INK.outline} strokeWidth={0.7} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Drivetrain                                                          */
/* ------------------------------------------------------------------ */

export function Cassette({ c, radii }: { c: Pt; radii: number[] }) {
  const sorted = [...radii].sort((a, b) => b - a);
  return (
    <g data-feature="cassette">
      <circle cx={c.x} cy={c.y} r={round(sorted[0] + 1.2)} fill="none" stroke={INK.component} strokeWidth={1.8} strokeDasharray="1.1 1.3" />
      {sorted.map((r, i) => (
        <circle key={r} cx={c.x} cy={c.y} r={round(r)} fill={i % 2 === 0 ? "#7a887d" : "#a3aea5"} stroke={INK.componentMid} strokeWidth={0.45} />
      ))}
      <circle cx={c.x} cy={c.y} r={round(sorted[sorted.length - 1] * 0.7)} fill={INK.component} />
    </g>
  );
}

export function Chainrings({ c, radii, arms, band }: { c: Pt; radii: number[]; arms: number; band: number }) {
  const [big, ...inner] = [...radii].sort((a, b) => b - a);
  return (
    <g data-feature={radii.length > 1 ? "double-chainring" : "single-chainring"}>
      {inner.map((r) => (
        <g key={r}>
          <circle cx={c.x} cy={c.y} r={round(r)} fill="none" stroke={INK.componentLight} strokeWidth={round(band * 0.8)} />
          <circle cx={c.x} cy={c.y} r={round(r + band * 0.5)} fill="none" stroke={INK.componentLight} strokeWidth={1.2} strokeDasharray="1.2 1.4" />
        </g>
      ))}
      <circle cx={c.x} cy={c.y} r={round(big + band * 0.42)} fill="none" stroke={INK.component} strokeWidth={1.8} strokeDasharray="1.3 1.5" />
      <circle cx={c.x} cy={c.y} r={round(big - band * 0.1)} fill="none" stroke={INK.component} strokeWidth={round(band)} />
      <circle cx={c.x} cy={c.y} r={round(big - band * 0.55)} fill="none" stroke={INK.metalDark} strokeWidth={0.6} />
      {Array.from({ length: arms }, (_, k) => {
        const e = svgPolar(c, big - band * 0.5, k * (360 / arms) + 20);
        return <line key={k} x1={c.x} y1={c.y} x2={round(e.x)} y2={round(e.y)} stroke={INK.component} strokeWidth={round(band * 0.9)} strokeLinecap="round" />;
      })}
    </g>
  );
}

export function CrankArm({ from, to, w1, w2, far = false }: { from: Pt; to: Pt; w1: number; w2: number; far?: boolean }) {
  return (
    <g data-feature={far ? "crank-arm-far" : "crank-arm"}>
      <path d={tubePath(from, w1, to, w2)} fill={far ? INK.componentLight : INK.component} stroke={INK.outline} strokeWidth={0.9} />
      {!far && <circle cx={from.x} cy={from.y} r={round(w1 * 0.55)} fill={INK.metal} stroke={INK.outline} strokeWidth={0.8} />}
      <circle cx={to.x} cy={to.y} r={round(w2 * 0.45)} fill={INK.metalDark} />
    </g>
  );
}

export function Pedal({ c, kind, scale, far = false }: { c: Pt; kind: "flat" | "clipless"; scale: number; far?: boolean }) {
  const fill = far ? INK.componentLight : INK.component;
  if (kind === "flat") {
    const w = 100 * scale;
    const h = 22 * scale;
    return (
      <g data-feature="flat-pedal">
        <rect x={round(c.x - w / 2)} y={round(c.y - h / 2)} width={round(w)} height={round(h)} rx={round(h * 0.3)} fill={fill} stroke={INK.outline} strokeWidth={0.9} />
        <line x1={round(c.x - w / 2 + 2)} y1={round(c.y)} x2={round(c.x + w / 2 - 2)} y2={round(c.y)} stroke={INK.metalDark} strokeWidth={0.7} />
      </g>
    );
  }
  const pts = [P(-40, -4), P(30, -6), P(42, 0), P(30, 8), P(-36, 7)].map((q) => add(c, mul(q, scale)));
  return (
    <g data-feature="clipless-pedal">
      <path d={polygonPath(pts)} fill={fill} stroke={INK.outline} strokeWidth={0.9} strokeLinejoin="round" />
      <circle cx={c.x} cy={c.y} r={round(4 * scale)} fill={INK.metal} />
    </g>
  );
}

export function Chain({ d }: { d: string }) {
  return (
    <g data-feature="chain-loop" fill="none" strokeLinejoin="round">
      <path d={d} stroke={INK.outline} strokeWidth={3.4} />
      <path d={d} stroke={INK.metal} strokeWidth={1.3} strokeDasharray="2.2 3" />
    </g>
  );
}

type Pulley = { c: Pt; r: number };

/** Jockey wheels: drawn before the chain so the chain wraps over their teeth. */
export function DerailleurPulleys({ guide, tension }: { guide: Pulley; tension: Pulley }) {
  return (
    <g data-feature="derailleur-pulleys">
      {[guide, tension].map((p, i) => (
        <g key={i}>
          <circle cx={round(p.c.x)} cy={round(p.c.y)} r={round(p.r + 0.8)} fill={INK.component} />
          <circle cx={round(p.c.x)} cy={round(p.c.y)} r={round(p.r)} fill={INK.componentLight} stroke={INK.outline} strokeWidth={0.7} />
        </g>
      ))}
    </g>
  );
}

/** Hanger, parallelogram body and outer cage plate: drawn over the chain. */
export function DerailleurBody({ dropout, knuckle, pivot, guide, tension }: { dropout: Pt; knuckle: Pt; pivot: Pt; guide: Pulley; tension: Pulley }) {
  const w = Math.min(guide.r, tension.r) * 0.5;
  return (
    <g data-feature="rear-derailleur">
      <path d={tubePath(dropout, 4, knuckle, 3.4)} fill={INK.componentMid} stroke={INK.outline} strokeWidth={0.8} />
      <path d={tubePath(knuckle, 5.6, pivot, 4.6)} fill={INK.component} stroke={INK.outline} strokeWidth={0.9} />
      <path d={tubePath(knuckle, 2.6, pivot, 2)} fill={INK.componentLight} />
      <path d={tubePath(pivot, 4, guide.c, w)} fill={INK.component} stroke={INK.outline} strokeWidth={0.8} />
      <path data-feature="derailleur-cage" d={tubePath(guide.c, w, tension.c, w * 1.15)} fill={INK.component} stroke={INK.outline} strokeWidth={0.9} />
      <path d={tubePath(guide.c, w * 0.42, tension.c, w * 0.5)} fill={INK.componentMid} />
      {[guide.c, tension.c].map((p, i) => (
        <circle key={i} cx={round(p.x)} cy={round(p.y)} r={1.9} fill={INK.metal} stroke={INK.outline} strokeWidth={0.6} />
      ))}
      <Bolt c={knuckle} r={2.2} />
      <Bolt c={pivot} r={2.4} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Frame                                                               */
/* ------------------------------------------------------------------ */

export type TubeSpec = { name: string; a: Pt; b: Pt; ra: number; rb: number };

/**
 * Paints a group of frame tubes as one welded/moulded member: all outlines
 * first, then all fills, so joints merge cleanly without visible seams.
 */
export function FrameMember({ tubes, fill, outline = INK.outline, feature }: { tubes: TubeSpec[]; fill: string; outline?: string; feature?: string }) {
  return (
    <g data-feature={feature}>
      <g fill={outline} stroke={outline} strokeWidth={2.4} strokeLinejoin="round">
        {tubes.map((tube) => <path key={tube.name} d={tubePath(tube.a, tube.ra, tube.b, tube.rb)} />)}
      </g>
      <g fill={fill}>
        {tubes.map((tube) => <path key={tube.name} data-tube={tube.name} d={tubePath(tube.a, tube.ra, tube.b, tube.rb)} />)}
      </g>
    </g>
  );
}

/** Subtle highlight along the upper edge of a tube (material cue). */
export function TubeHighlight({ a, b, offset }: { a: Pt; b: Pt; offset: number }) {
  const n = perp(norm(sub(b, a)));
  const shift = mul(n.y < 0 ? n : mul(n, -1), offset);
  const s = add(add(a, shift), mul(norm(sub(b, a)), offset));
  const e = add(add(b, shift), mul(norm(sub(a, b)), offset));
  return <path d={`M ${fmt(s)} L ${fmt(e)}`} stroke="#ffffff" strokeOpacity={0.35} strokeWidth={1.1} strokeLinecap="round" fill="none" />;
}

export function Bolt({ c, r = 2.4 }: { c: Pt; r?: number }) {
  return <circle cx={round(c.x)} cy={round(c.y)} r={r} fill={INK.metalLight} stroke={INK.outline} strokeWidth={0.8} />;
}

/* ------------------------------------------------------------------ */
/* Accessories                                                         */
/* ------------------------------------------------------------------ */

/** Fender arc concentric with a wheel (visual angles in degrees, swept clockwise from start to end). */
export function Fender({ c, r, from, to, width }: { c: Pt; r: number; from: number; to: number; width: number }) {
  const s = svgPolar(c, r, from);
  const e = svgPolar(c, r, to);
  const sweep = ((from - to) % 360 + 360) % 360;
  return (
    <g data-feature="fender">
      <path d={`M ${fmt(s)} A ${round(r)} ${round(r)} 0 ${sweep > 180 ? 1 : 0} 1 ${fmt(e)}`} fill="none" stroke={INK.outline} strokeWidth={round(width + 1.6)} strokeLinecap="round" />
      <path d={`M ${fmt(s)} A ${round(r)} ${round(r)} 0 ${sweep > 180 ? 1 : 0} 1 ${fmt(e)}`} fill="none" stroke={INK.accessory} strokeWidth={round(width)} strokeLinecap="round" />
    </g>
  );
}

export function Strut({ a, b, w = 1.8, color = INK.accessory }: { a: Pt; b: Pt; w?: number; color?: string }) {
  return <line x1={round(a.x)} y1={round(a.y)} x2={round(b.x)} y2={round(b.y)} stroke={color} strokeWidth={w} strokeLinecap="round" />;
}

/** Air shock: eyelets, air can, exposed shaft and damper body between two mounts. */
export function RearShock({ a, b, scale }: { a: Pt; b: Pt; scale: number }) {
  const u = norm(sub(a, b));
  const at = (d: number) => add(b, mul(u, d * scale));
  const total = Math.hypot(a.x - b.x, a.y - b.y) / scale;
  return (
    <g data-feature="rear-shock">
      <path d={tubePath(b, 9 * scale, at(70), 15 * scale)} fill={INK.component} stroke={INK.outline} strokeWidth={0.9} />
      <path d={tubePath(at(60), 7.5 * scale, at(92), 7.5 * scale)} fill={INK.stanchion} stroke={INK.outline} strokeWidth={0.8} />
      <path d={tubePath(at(88), 22 * scale, at(total - 14), 22 * scale)} fill={INK.componentMid} stroke={INK.outline} strokeWidth={1} />
      <path d={polygonPath(tubePolygon(at(97), 22.5 * scale, at(103), 22.5 * scale))} fill={INK.metalLight} stroke={INK.outline} strokeWidth={0.6} />
      <path d={tubePath(at(total - 18), 12 * scale, a, 9 * scale)} fill={INK.component} stroke={INK.outline} strokeWidth={0.9} />
      <Bolt c={a} r={9 * scale * 0.55} />
      <Bolt c={b} r={9 * scale * 0.55} />
    </g>
  );
}

export function Light({ c, w, h, front }: { c: Pt; w: number; h: number; front: boolean }) {
  return (
    <g data-feature={front ? "front-light" : "rear-light"}>
      <rect x={round(c.x - w / 2)} y={round(c.y - h / 2)} width={round(w)} height={round(h)} rx={round(h * 0.35)} fill={INK.component} stroke={INK.outline} strokeWidth={0.8} />
      <rect x={round(front ? c.x + w / 2 - 2.4 : c.x - w / 2)} y={round(c.y - h / 2 + 1)} width={2.4} height={round(h - 2)} rx={1} fill={front ? INK.cream : "#d4685a"} />
    </g>
  );
}
