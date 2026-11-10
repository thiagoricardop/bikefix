import { BicycleProfileIllustration } from "@/components/illustrations/bicycle-profile-illustration";

/** Homepage hero artwork uses the same mountain-bike profile as the explorer. */
export function HeroBikeIllustration() {
  return (
    <BicycleProfileIllustration
      type="mountain"
      className="hero-bike-svg"
      title="Mountain bike illustration"
    />
  );
}
