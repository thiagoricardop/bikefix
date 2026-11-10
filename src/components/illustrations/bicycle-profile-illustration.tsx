import { useId } from "react";
import { BICYCLE_TYPE_BY_ID } from "@/data/bicycle-types/catalog";
import { BIKE_PROFILES } from "@/components/bicycle-explorer/bicycle-svg/profiles";
import { VIEW_HEIGHT, VIEW_WIDTH, round } from "@/components/bicycle-explorer/bicycle-svg/geometry";
import { INK } from "@/components/bicycle-explorer/bicycle-svg/primitives";
import type { BikeTypeId } from "@/types/bicycle";

type BicycleProfileIllustrationProps = {
  type: BikeTypeId;
  className?: string;
  title?: string;
  decorative?: boolean;
};

/**
 * Reuses the exact profile-specific SVG artwork from the interactive explorer,
 * without the invisible selection targets. Homepage previews therefore stay
 * visually consistent with the bike users can actually select and inspect.
 */
export function BicycleProfileIllustration({
  type,
  className,
  title,
  decorative = false,
}: BicycleProfileIllustrationProps) {
  const profile = BIKE_PROFILES[type];
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ids = {
    frame: `preview-bike-frame-${uid}`,
    frameShade: `preview-bike-frame-shade-${uid}`,
    battery: `preview-bike-battery-${uid}`,
  };
  const descriptionId = `preview-bike-desc-${uid}`;
  const typeName = BICYCLE_TYPE_BY_ID[type].name;
  const Art = profile.Art;
  const { rearAxle, frontAxle, groundY } = profile.landmarks;
  const rearRadius = profile.wheels.rear.outerR;

  return (
    <svg
      className={["bicycle-profile-illustration", className].filter(Boolean).join(" ")}
      data-bike-type={type}
      data-geometry-profile={profile.geometryProfile}
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      fill="none"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-labelledby={decorative ? undefined : `${descriptionId}-title ${descriptionId}`}
    >
      {!decorative && (
        <>
          <title id={`${descriptionId}-title`}>{title ?? `${typeName} illustration`}</title>
          <desc id={descriptionId}>
            {`${profile.subtype}. ${profile.summary} Representative educational illustration; actual bicycle equipment can vary.`}
          </desc>
        </>
      )}
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
        rx={round((frontAxle.x - rearAxle.x) / 2 + rearRadius * 0.9)}
        ry={7}
        fill={INK.outline}
        opacity={0.1}
      />
      <g className="bike-art" aria-hidden="true" pointerEvents="none">
        <Art ids={ids} />
      </g>
    </svg>
  );
}
