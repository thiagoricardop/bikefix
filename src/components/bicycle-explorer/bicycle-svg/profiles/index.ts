import type { BikeTypeId } from "@/types/bicycle";
import type { BikeProfile } from "../assemblies";
import { ebikeProfile } from "./ebike";
import { gravelProfile } from "./gravel";
import { hybridProfile } from "./hybrid";
import { mountainProfile } from "./mountain";
import { roadProfile } from "./road";

/** One independently-defined geometry profile per bicycle type. */
export const BIKE_PROFILES: Record<BikeTypeId, BikeProfile> = {
  road: roadProfile,
  mountain: mountainProfile,
  hybrid: hybridProfile,
  gravel: gravelProfile,
  ebike: ebikeProfile,
};
