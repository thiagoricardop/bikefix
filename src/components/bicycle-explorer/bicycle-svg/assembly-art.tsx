import type { ReactNode } from "react";
import {
  BEAD_RADIUS_MM, type DrivetrainModel, type DropBarModel, type FlatBarModel, type RackModel, type RigidForkModel, type SeatModel,
  type StemModel, type SuspensionForkModel, type WheelModel,
} from "./assemblies";
import { DRAW_SCALE, add, fmt, lerp, mul, norm, perp, polygonPath, round, smoothPath, sub, svgPolar, tubePath, tubePolygon, type Pt } from "./geometry";
import {
  Bolt, BrakeCaliper, Cassette, Chain, Chainrings, CrankArm, DerailleurBody, DerailleurPulleys, DiscRotor, Fender, INK, Pedal, Strut, Wheel,
} from "./primitives";

const S = DRAW_SCALE;

export function WheelArt({ w, feature, behind, front }: { w: WheelModel; feature: string; behind?: ReactNode; front?: ReactNode }) {
  return (
    <Wheel
      c={w.c}
      outerR={w.outerR}
      beadR={w.beadR}
      rimDepth={w.rimDepth}
      tread={w.spec.tread}
      spokeCount={w.spec.spokes}
      radial={w.spec.radialLacing}
      hubR={w.hubR}
      flangeR={w.flangeR}
      feature={feature}
      behind={behind}
      front={front}
    />
  );
}

/** Rotor and caliper on the far (non-drive) side: rendered behind the spokes. */
export function DiscBrakeArt({ w }: { w: WheelModel }) {
  if (w.brake.kind !== "disc") return null;
  const b = w.brake;
  return (
    <g data-feature="disc-brake">
      <DiscRotor c={w.c} r={b.rotorR} />
      <BrakeCaliper c={b.caliper} hub={w.c} mount={b.mount} length={b.length} depth={b.depth} kind={b.style} />
    </g>
  );
}

/**
 * Hidden-line convention: the rear disc caliper sits on the far side, behind the
 * drive-side stays and cassette. A dashed outline shows where it is so the part
 * remains findable; the solid caliper is still drawn in its true layer.
 */
export function HiddenCaliperOutline({ w }: { w: WheelModel }) {
  if (w.brake.kind !== "disc") return null;
  const b = w.brake;
  const radial = norm(sub(b.caliper, w.c));
  const angle = (Math.atan2(radial.y, radial.x) * 180) / Math.PI + 90;
  const box = { x: round(-b.length / 2), y: round(-b.depth / 2), width: round(b.length), height: round(b.depth), rx: round(b.depth * 0.36) };
  return (
    <g data-feature="hidden-caliper-outline" transform={`translate(${round(b.caliper.x)} ${round(b.caliper.y)}) rotate(${round(angle)})`}>
      <rect {...box} fill={INK.component} fillOpacity={0.28} stroke={INK.outline} strokeWidth={2.2} strokeDasharray="3 2.2" />
      <rect {...box} fill="none" stroke={INK.metalLight} strokeWidth={1} strokeDasharray="3 2.2" />
    </g>
  );
}

/** Dual-pivot rim caliper: near arm crosses the tire so the pad visibly meets the rim braking track. */
export function RimBrakeArt({ w, mount }: { w: WheelModel; mount: Pt }) {
  if (w.brake.kind !== "rim") return null;
  const b = w.brake;
  const radial = norm(sub(b.pad, w.c));
  const tangent = perp(radial);
  const angle = (Math.atan2(radial.y, radial.x) * 180) / Math.PI + 90;
  const armMid = add(lerp(b.body, b.pad, 0.5), mul(tangent, 2.2));
  return (
    <g data-feature="rim-caliper">
      <path d={tubePath(mount, 1.8, b.body, 1.8)} fill={INK.metal} stroke={INK.outline} strokeWidth={0.6} />
      <path d={`M ${fmt(b.body)} Q ${fmt(armMid)} ${fmt(b.pad)}`} fill="none" stroke={INK.outline} strokeWidth={5.6} strokeLinecap="round" />
      <path d={`M ${fmt(b.body)} Q ${fmt(armMid)} ${fmt(b.pad)}`} fill="none" stroke={INK.metal} strokeWidth={3.6} strokeLinecap="round" />
      <g transform={`translate(${round(b.pad.x)} ${round(b.pad.y)}) rotate(${round(angle)})`}>
        <rect x={round(-b.padLength / 2)} y={-2.3} width={round(b.padLength)} height={4.6} rx={1.6} fill={INK.componentMid} stroke={INK.outline} strokeWidth={0.7} />
        <rect data-feature="brake-pad" x={round(-b.padLength / 2 + 1.5)} y={1.1} width={round(b.padLength - 3)} height={1.6} rx={0.6} fill="#1b201c" />
      </g>
      <g transform={`translate(${round(b.body.x)} ${round(b.body.y)}) rotate(${round(angle)})`}>
        <rect x={-9} y={-4.6} width={18} height={9.2} rx={3.6} fill={INK.metal} stroke={INK.outline} strokeWidth={0.9} />
        <rect x={-7} y={-3.2} width={6} height={2.4} rx={1} fill={INK.metalLight} />
      </g>
      <Bolt c={b.body} r={1.6} />
    </g>
  );
}

export function FarCrankArt({ d }: { d: DrivetrainModel }) {
  return (
    <g data-feature="far-crank" opacity={0.78}>
      <CrankArm from={d.bb} to={d.farPedal} w1={5.4} w2={4} far />
      <Pedal c={d.farPedal} kind={d.spec.pedal} scale={S * 0.9} far />
    </g>
  );
}

/** Cassette and jockey wheels (painted before frame stays and chain). */
export function RearDrivetrainArt({ d }: { d: DrivetrainModel }) {
  return (
    <g data-feature="rear-drivetrain">
      <Cassette c={d.cog} radii={d.cogRadii} />
      <DerailleurPulleys guide={d.guide} tension={d.tension} />
    </g>
  );
}

export function ChainringArt({ d, guard = false }: { d: DrivetrainModel; guard?: boolean }) {
  const big = Math.max(...d.ringRadii);
  return (
    <g data-feature="crankset">
      <Chainrings c={d.bb} radii={d.ringRadii} arms={4} band={2.6} />
      {guard && (
        <circle data-feature="chainring-guard" cx={d.bb.x} cy={d.bb.y} r={round(big + 4.2)} fill="none" stroke={INK.componentLight} strokeWidth={2.2} strokeOpacity={0.9} />
      )}
    </g>
  );
}

export function ChainArt({ d }: { d: DrivetrainModel }) {
  return <Chain d={d.chainD} />;
}

export function DerailleurArt({ d }: { d: DrivetrainModel }) {
  return <DerailleurBody dropout={d.dropout} knuckle={d.knuckle} pivot={d.pivot} guide={d.guide} tension={d.tension} />;
}

export function NearCrankArt({ d }: { d: DrivetrainModel }) {
  return (
    <g data-feature="near-crank">
      <CrankArm from={d.bb} to={d.nearPedal} w1={6.4} w2={4.6} />
      <Pedal c={d.nearPedal} kind={d.spec.pedal} scale={S} />
    </g>
  );
}

export function StemArt({ s, faceplate = true }: { s: StemModel; faceplate?: boolean }) {
  const rSteer = (36 * S) / 2;
  const back = add(s.steererTop, mul(norm(sub(s.steererTop, s.clamp)), 4));
  return (
    <g data-feature="stem">
      <path d={tubePath(s.headTop, rSteer, s.steererTop, rSteer)} fill={INK.componentMid} stroke={INK.outline} strokeWidth={0.9} />
      {s.spacerRings.map((p, i) => {
        const u = norm(sub(s.steererTop, s.headTop));
        const n = perp(u);
        const a = add(p, mul(n, rSteer + 0.6));
        const b = sub(p, mul(n, rSteer + 0.6));
        return <path key={`sp${i}`} d={`M ${fmt(a)} L ${fmt(b)}`} stroke={INK.outline} strokeWidth={0.7} />;
      })}
      <path d={tubePath(back, 7.4, s.clamp, 6)} fill={INK.component} stroke={INK.outline} strokeWidth={1} />
      <path d={tubePath(back, 3, s.clamp, 2.2)} fill={INK.componentLight} opacity={0.7} />
      {faceplate && <circle cx={round(s.clamp.x)} cy={round(s.clamp.y)} r={7.6} fill={INK.component} stroke={INK.outline} strokeWidth={1} />}
      <circle cx={round(s.steererTop.x)} cy={round(s.steererTop.y)} r={3} fill={INK.metal} stroke={INK.outline} strokeWidth={0.6} />
    </g>
  );
}

export function DropBarArt({ b, clamp }: { b: DropBarModel; clamp: Pt }) {
  return (
    <g data-feature={b.flared ? "flared-drop-bar" : "drop-bar"}>
      {b.farDropD && (
        <g data-feature="flared-far-drop">
          <path d={b.farDropD} fill="none" stroke={INK.outline} strokeWidth={6.4} strokeLinecap="round" opacity={0.55} />
          <path d={b.farDropD} fill="none" stroke={INK.componentLight} strokeWidth={4.2} strokeLinecap="round" opacity={0.6} />
        </g>
      )}
      <path d={b.barD} fill="none" stroke={INK.outline} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
      <path d={b.barD} fill="none" stroke={INK.component} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      <path d={b.barD} fill="none" stroke="#ffffff" strokeOpacity={0.12} strokeWidth={1.4} strokeLinecap="round" />
      <circle cx={round(clamp.x)} cy={round(clamp.y)} r={4.4} fill={INK.componentMid} stroke={INK.outline} strokeWidth={0.8} />
      <g data-feature="brake-shift-hood">
        <path d={b.leverD} fill="none" stroke={INK.outline} strokeWidth={5.4} strokeLinecap="round" />
        <path d={b.leverD} fill="none" stroke={INK.componentLight} strokeWidth={3.4} strokeLinecap="round" />
        <path d={b.hoodD} fill={INK.component} stroke={INK.outline} strokeWidth={1} strokeLinejoin="round" />
      </g>
    </g>
  );
}

export function FlatBarArt({ b, clamp, podLabel = true }: { b: FlatBarModel; clamp: Pt; podLabel?: boolean }) {
  return (
    <g data-feature="flat-bar">
      <path d={b.barD} fill="none" stroke={INK.outline} strokeWidth={7} strokeLinecap="round" />
      <path d={b.barD} fill="none" stroke={INK.component} strokeWidth={5} strokeLinecap="round" />
      <circle cx={round(clamp.x)} cy={round(clamp.y)} r={4.6} fill={INK.componentMid} stroke={INK.outline} strokeWidth={0.8} />
      <g data-feature="flat-bar-brake-lever">
        <path d={tubePath(b.leverBody, 3.4, b.leverTip, 1.6)} fill={INK.componentLight} stroke={INK.outline} strokeWidth={0.8} />
        <circle cx={round(b.leverBody.x)} cy={round(b.leverBody.y)} r={4} fill={INK.component} stroke={INK.outline} strokeWidth={0.8} />
      </g>
      {podLabel && (
        <g data-feature="trigger-shifter">
          <path d={tubePath(b.pod, 5, b.podPaddle, 2.2)} fill={INK.componentMid} stroke={INK.outline} strokeWidth={0.8} />
          <rect x={round(b.pod.x - 7)} y={round(b.pod.y - 4.6)} width={14} height={9.2} rx={3} fill={INK.component} stroke={INK.outline} strokeWidth={0.9} />
        </g>
      )}
      <path data-feature="grip" d={tubePath(b.grip[0], 5.6, b.grip[1], 5.6)} fill="#28302a" stroke={INK.outline} strokeWidth={0.9} />
    </g>
  );
}

export function SeatpostArt({ s }: { s: SeatModel }) {
  return (
    <g data-feature="seatpost">
      <path d={tubePath(s.postBottom, 5.4, s.postTop, 5.4)} fill={INK.metal} stroke={INK.outline} strokeWidth={0.9} />
      <path d={tubePath(s.postBottom, 1.6, s.postTop, 1.6)} fill={INK.metalLight} opacity={0.8} />
      <path d={tubePath(s.postTop, 5, add(s.postTop, mul(norm(sub(s.rails[1], s.rails[0])), 6)), 4)} fill={INK.componentMid} stroke={INK.outline} strokeWidth={0.8} />
    </g>
  );
}

/** Dropper seatpost: wider lower body, collar and slimmer stanchion. */
export function DropperPostArt({ s }: { s: SeatModel }) {
  const collar = lerp(s.cluster, s.postTop, 0.38);
  return (
    <g data-feature="dropper-post">
      <path d={tubePath(s.postBottom, 6.6, collar, 6.6)} fill={INK.component} stroke={INK.outline} strokeWidth={0.9} />
      <path d={tubePath(collar, 5.2, s.postTop, 5.2)} fill={INK.stanchion} stroke={INK.outline} strokeWidth={0.8} />
      <path d={tubePath(lerp(s.postBottom, collar, 0.82), 7.4, collar, 7.4)} fill={INK.componentMid} stroke={INK.outline} strokeWidth={0.8} />
      <path d={tubePath(s.postTop, 6, add(s.postTop, mul(norm(sub(s.rails[1], s.rails[0])), 7)), 4.6)} fill={INK.component} stroke={INK.outline} strokeWidth={0.8} />
    </g>
  );
}

export function SaddleArt({ s }: { s: SeatModel }) {
  return (
    <g data-feature={`saddle-${s.style}`}>
      <path d={`M ${fmt(s.rails[0])} L ${fmt(s.rails[1])}`} stroke={INK.metalDark} strokeWidth={1.6} strokeLinecap="round" />
      <path d={smoothPath(s.saddlePoints)} fill={INK.component} stroke={INK.outline} strokeWidth={1.1} strokeLinejoin="round" />
      <path d={smoothPath(s.saddlePoints.slice(1, 6), false)} fill="none" stroke="#ffffff" strokeOpacity={0.14} strokeWidth={1.3} />
    </g>
  );
}

export function RigidForkArt({ f, far = false, fill }: { f: RigidForkModel; far?: boolean; fill: string }) {
  const shift = far ? { x: -5, y: -2 } : { x: 0, y: 0 };
  const m = (p: Pt) => ({ x: p.x + shift.x, y: p.y + shift.y });
  return (
    <g data-feature={far ? "fork-far-blade" : "rigid-fork"} opacity={far ? 0.55 : 1}>
      <path d={tubePath(m(f.crownTop), f.rTop * 1.08, m(f.crown), f.rTop)} fill={far ? INK.componentLight : fill} stroke={INK.outline} strokeWidth={1.4} />
      <path d={tubePath(m(f.crown), f.rTop, m(f.tip), f.rBottom)} fill={far ? INK.componentLight : fill} stroke={INK.outline} strokeWidth={1.4} />
      {!far && (
        <>
          <path d={tubePath(lerp(f.crown, f.axle, 0.08), f.rTop * 0.3, lerp(f.crown, f.axle, 0.85), f.rBottom * 0.3)} fill="#ffffff" opacity={0.18} />
          {f.bosses.map((b, i) => <circle key={i} data-feature="fork-mount-boss" cx={round(b.x)} cy={round(b.y)} r={1.6} fill={INK.metal} stroke={INK.outline} strokeWidth={0.5} />)}
          <circle cx={round(f.axle.x)} cy={round(f.axle.y)} r={3.8} fill={INK.metal} stroke={INK.outline} strokeWidth={0.8} />
          <path data-feature="headset-lower-cup" d={polygonPath(tubePolygon(f.crownTop, f.rTop * 1.14, lerp(f.crownTop, f.crown, 0.32), f.rTop * 1.1))} fill={INK.component} stroke={INK.outline} strokeWidth={0.8} strokeLinejoin="round" />
        </>
      )}
    </g>
  );
}

export function SuspensionForkArt({ f, far = false }: { f: SuspensionForkModel; far?: boolean }) {
  if (far) {
    const shift = (p: Pt) => ({ x: p.x - 6, y: p.y - 2 });
    return (
      <g data-feature="fork-far-leg" opacity={0.5}>
        <path d={tubePath(shift(f.legTop), f.rStanchion, shift(f.seal), f.rStanchion)} fill={INK.stanchion} stroke={INK.outline} strokeWidth={0.9} />
        <path d={tubePath(shift(f.seal), f.rLower, shift(f.lowerBottom), f.rLower * 0.8)} fill={INK.componentLight} stroke={INK.outline} strokeWidth={0.9} />
        <path d={tubePath(shift(f.postMount), 3, add(shift(f.postMount), { x: -6, y: 4 }), 3)} fill={INK.componentLight} />
      </g>
    );
  }
  const sealTop = lerp(f.seal, f.legTop, 0.06);
  return (
    <g data-feature="suspension-fork">
      <path data-feature="fork-stanchion" d={tubePath(f.legTop, f.rStanchion, sealTop, f.rStanchion)} fill={INK.stanchion} stroke={INK.outline} strokeWidth={1} />
      <path d={tubePath(lerp(f.legTop, f.seal, 0.1), f.rStanchion * 0.32, lerp(f.legTop, f.seal, 0.95), f.rStanchion * 0.32)} fill="#ffffff" opacity={0.55} />
      <path data-feature="fork-arch" d={f.archD} fill={INK.component} stroke={INK.outline} strokeWidth={1} strokeLinejoin="round" />
      <path data-feature="fork-lower" d={tubePath(f.seal, f.rLower, f.lowerBottom, f.rLower * 0.78)} fill={INK.component} stroke={INK.outline} strokeWidth={1.1} />
      <path d={tubePath(lerp(f.seal, f.lowerBottom, 0.05), f.rLower * 0.28, lerp(f.seal, f.lowerBottom, 0.8), f.rLower * 0.22)} fill="#ffffff" opacity={0.12} />
      <path d={tubePath(f.seal, f.rLower * 1.04, lerp(f.seal, f.lowerBottom, 0.06), f.rLower * 1.02)} fill={INK.componentMid} stroke={INK.outline} strokeWidth={0.8} />
      <path data-feature="fork-crown" d={f.crownD} fill={INK.component} stroke={INK.outline} strokeWidth={1.1} strokeLinejoin="round" />
      <circle cx={round(f.axle.x)} cy={round(f.axle.y)} r={4.2} fill={INK.metal} stroke={INK.outline} strokeWidth={0.8} />
      <circle cx={round(f.axle.x)} cy={round(f.axle.y)} r={1.6} fill={INK.component} />
    </g>
  );
}

/** Thin hint of the rim braking surface for rim-brake wheels. */
export function RimTrack({ w }: { w: WheelModel }) {
  if (w.brake.kind !== "rim") return null;
  return <circle data-feature="rim-brake-track" cx={round(w.c.x)} cy={round(w.c.y)} r={round((BEAD_RADIUS_MM - 7) * S)} fill="none" stroke={INK.metalLight} strokeWidth={1.4} strokeOpacity={0.75} />;
}

/** Full-coverage fender concentric with the wheel, with stays to the dropout eyelet. */
export function FenderArt({ w, from, to, stays, gapMm = 16 }: { w: WheelModel; from: number; to: number; stays: number[]; gapMm?: number }) {
  const r = w.outerR + gapMm * S;
  return (
    <g data-feature="fender-set">
      {stays.map((a, i) => (
        <Strut key={i} a={svgPolar(w.c, 5, a)} b={svgPolar(w.c, r, a)} w={1.3} />
      ))}
      <Fender c={w.c} r={r} from={from} to={to} width={4.4} />
    </g>
  );
}

export function RackArt({ r }: { r: RackModel }) {
  const [a, b] = r.platform;
  const lines = [...r.struts, r.platform];
  return (
    <g data-feature="rear-rack" fill="none" strokeLinecap="round">
      {lines.map(([p, q], i) => (
        <path key={`o${i}`} d={`M ${fmt(p)} L ${fmt(q)}`} stroke={INK.outline} strokeWidth={i === lines.length - 1 ? 4.8 : 3.2} />
      ))}
      {lines.map(([p, q], i) => (
        <path key={`f${i}`} d={`M ${fmt(p)} L ${fmt(q)}`} stroke={INK.accessory} strokeWidth={i === lines.length - 1 ? 3.1 : 1.7} />
      ))}
      <path d={`M ${fmt(a)} L ${fmt(b)}`} stroke="#ffffff" strokeOpacity={0.2} strokeWidth={0.8} transform="translate(0 -0.8)" />
    </g>
  );
}

/** Small cover for the bolt-on parts that are not separately selectable (bosses, eyelets). */
export function Boss({ c }: { c: Pt }) {
  return <circle data-feature="frame-boss" cx={round(c.x)} cy={round(c.y)} r={1.5} fill={INK.metal} stroke={INK.outline} strokeWidth={0.5} />;
}
