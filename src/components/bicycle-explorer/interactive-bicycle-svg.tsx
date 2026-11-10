import { useId, type KeyboardEvent } from "react";
import { BICYCLE_TYPE_BY_ID } from "@/data/bicycle-types/catalog";
import type { BikeTypeId } from "@/types/bicycle";
import type { ArtIds } from "./bicycle-svg/assemblies";
import { VIEW_HEIGHT, VIEW_WIDTH, polygonPath, polylinePath, round, type HitShape, type PartRegion } from "./bicycle-svg/geometry";
import { INK } from "./bicycle-svg/primitives";
import { BIKE_PROFILES } from "./bicycle-svg/profiles";

type Props = {
  type: BikeTypeId;
  selectedPartId: string;
  onSelectPart: (componentId: string) => void;
  componentNames: Record<string, string>;
};

/** Transparent, pointer-active hit geometry for one selectable part. */
function HitShapeView({ shape }: { shape: HitShape }) {
  switch (shape.kind) {
    case "circle":
      return <circle className="hit-shape hit-shape--area" cx={round(shape.c.x)} cy={round(shape.c.y)} r={round(shape.r)} fill="transparent" />;
    case "polygon":
      return <path className="hit-shape hit-shape--area" d={polygonPath(shape.points)} fill="transparent" />;
    case "ring":
      return (
        <circle
          className="hit-shape hit-shape--stroke"
          cx={round(shape.c.x)}
          cy={round(shape.c.y)}
          r={round(shape.r)}
          fill="none"
          stroke="transparent"
          strokeWidth={round(shape.width)}
          pointerEvents="stroke"
        />
      );
    case "stroke":
      return (
        <path
          className="hit-shape hit-shape--stroke"
          d={polylinePath(shape.points)}
          fill="none"
          stroke="transparent"
          strokeWidth={round(shape.width)}
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="stroke"
        />
      );
  }
}

/**
 * Selection halo painted beneath the artwork: a lime band with a dashed dark
 * rim that follows the part outline, so the mechanical detail stays visible and
 * the selected state is not conveyed by colour alone.
 */
function HaloShape({ shape, extra, stroke, dash }: { shape: HitShape; extra: number; stroke: string; dash?: string }) {
  const common = { stroke, strokeDasharray: dash, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (shape.kind) {
    case "circle":
      return <circle cx={round(shape.c.x)} cy={round(shape.c.y)} r={round(shape.r)} fill={stroke} strokeWidth={extra} {...common} />;
    case "polygon":
      return <path d={polygonPath(shape.points)} fill={stroke} strokeWidth={extra} {...common} />;
    case "ring":
      return <circle cx={round(shape.c.x)} cy={round(shape.c.y)} r={round(shape.r)} fill="none" strokeWidth={round(shape.width + extra)} {...common} />;
    case "stroke":
      return <path d={polylinePath(shape.points)} fill="none" strokeWidth={round(shape.width + extra)} {...common} />;
  }
}

function SelectionHalo({ part }: { part: PartRegion }) {
  const shapes = part.halo ?? part.hit;
  return (
    <g className="part-halo" data-testid="selected-part-halo" data-halo-for={part.id} aria-hidden="true">
      <g opacity={0.9}>{shapes.map((s, i) => <HaloShape key={`r${i}`} shape={s} extra={11} stroke={INK.outline} dash="4 3" />)}</g>
      <g>{shapes.map((s, i) => <HaloShape key={`b${i}`} shape={s} extra={8} stroke={INK.lime} />)}</g>
    </g>
  );
}

/** Translucent tint over the artwork so small or partly hidden parts still read as selected. */
function SelectionTint({ part }: { part: PartRegion }) {
  const shapes = part.halo ?? part.hit;
  return (
    <g className="part-tint" aria-hidden="true" pointerEvents="none" opacity={0.32}>
      {shapes.map((s, i) => <HaloShape key={i} shape={s} extra={0} stroke={INK.lime} />)}
    </g>
  );
}

function SelectedMarker({ part }: { part: PartRegion }) {
  const { x, y } = part.anchor;
  return (
    <g className="part-marker" data-testid="selected-part-marker" data-marker-for={part.id} aria-hidden="true" pointerEvents="none">
      <circle cx={round(x)} cy={round(y)} r={7.5} fill={INK.lime} stroke={INK.outline} strokeWidth={2} />
      <circle cx={round(x)} cy={round(y)} r={2.6} fill={INK.outline} />
    </g>
  );
}

export function InteractiveBicycleSvg({ type, selectedPartId, onSelectPart, componentNames }: Props) {
  const profile = BIKE_PROFILES[type];
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ids: ArtIds = { frame: `bike-frame-${uid}`, frameShade: `bike-frame-shade-${uid}`, battery: `bike-battery-${uid}` };
  const descId = `bike-desc-${uid}`;
  const label = (id: string) => componentNames[id] ?? id.replaceAll("-", " ");
  const selectedPart = profile.parts.find((part) => part.id === selectedPartId);
  const { rearAxle, frontAxle, groundY } = profile.landmarks;
  const rearR = profile.wheels.rear.outerR;
  const Art = profile.Art;

  const onKey = (id: string) => (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectPart(id);
    }
  };

  return (
    <svg
      className={`interactive-bike-svg interactive-bike-svg--${type}`}
      data-bike-type={type}
      data-geometry-profile={profile.geometryProfile}
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      role="group"
      aria-label={`Interactive ${BICYCLE_TYPE_BY_ID[type].name} side view. Tab to focus a part and press Enter or Space to select.`}
      aria-describedby={descId}
    >
      <desc id={descId}>
        {`${profile.subtype}. ${profile.summary} Educational representative configuration; it does not identify a specific make, model or your installed components.`}
      </desc>
      <defs>
        <linearGradient id={ids.frame} gradientUnits="userSpaceOnUse" x1="0" y1="120" x2="0" y2="380">
          <stop offset="0" stopColor="#6f9a76" />
          <stop offset="0.55" stopColor="#3f6d4c" />
          <stop offset="1" stopColor="#2f5a3f" />
        </linearGradient>
        <linearGradient id={ids.frameShade} gradientUnits="userSpaceOnUse" x1="0" y1="200" x2="0" y2="400">
          <stop offset="0" stopColor="#4c7656" />
          <stop offset="1" stopColor="#24432f" />
        </linearGradient>
        <linearGradient id={ids.battery} gradientUnits="userSpaceOnUse" x1="0" y1="180" x2="0" y2="360">
          <stop offset="0" stopColor="#59625c" />
          <stop offset="1" stopColor="#2a302c" />
        </linearGradient>
      </defs>

      <ellipse
        aria-hidden="true"
        cx={round((rearAxle.x + frontAxle.x) / 2)}
        cy={round(groundY + 2)}
        rx={round((frontAxle.x - rearAxle.x) / 2 + rearR * 0.9)}
        ry={7}
        fill={INK.outline}
        opacity={0.1}
      />

      {selectedPart && <SelectionHalo part={selectedPart} />}

      <g className="bike-art" aria-hidden="true" pointerEvents="none">
        <Art ids={ids} />
      </g>

      {selectedPart && <SelectionTint part={selectedPart} />}
      {selectedPart && <SelectedMarker part={selectedPart} />}

      <g className="bike-hit-layer">
        {profile.parts.map((part) => {
          const selected = part.id === selectedPartId;
          const name = label(part.id);
          return (
            <g
              key={part.id}
              id={`${type}-${part.id}`}
              className={`bike-part${selected ? " is-selected" : ""}`}
              data-component-id={part.id}
              data-anchor-x={round(part.anchor.x)}
              data-anchor-y={round(part.anchor.y)}
              role="button"
              tabIndex={0}
              aria-label={name}
              aria-pressed={selected}
              onClick={() => onSelectPart(part.id)}
              onKeyDown={onKey(part.id)}
            >
              <title>{name}</title>
              {part.hit.map((shape, i) => <HitShapeView key={i} shape={shape} />)}
              <circle className="part-focus-ring" cx={round(part.anchor.x)} cy={round(part.anchor.y)} r={12} fill="none" />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
