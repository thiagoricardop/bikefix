import type { BikeTypeId } from "@/types/bicycle";
import { BicycleProfileIllustration } from "@/components/illustrations/bicycle-profile-illustration";

export type { BikeTypeId } from "@/types/bicycle";

type BikeTypeIllustrationProps = {
  type: BikeTypeId;
};

/** Each bike-type card shows its matching explorer-grade SVG profile. */
export function BikeTypeIllustration({ type }: BikeTypeIllustrationProps) {
  return (
    <BicycleProfileIllustration
      type={type}
      className="bike-type-art"
      decorative
    />
  );
}
