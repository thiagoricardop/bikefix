import { BICYCLE_TYPES } from "@/data/bicycle-types/catalog";
import { BICYCLE_COMPONENTS } from "@/data/components/catalog";
import { DIAGNOSTIC_RULES } from "@/data/diagnostics/catalog";
import { REPAIR_GUIDES } from "@/data/guides/catalog";
import { GUIDE_PLAYER_FIXTURES } from "@/data/guides/guide-player-fixtures";
import { GUIDE_SOURCE_REFERENCES } from "@/data/guides/sources";
import { SYMPTOMS } from "@/data/symptoms/catalog";
import type { DomainCatalog } from "@/lib/validation/domain-catalog";

export const DOMAIN_CATALOG_FIXTURE: DomainCatalog = {
  components: BICYCLE_COMPONENTS,
  bicycleTypes: BICYCLE_TYPES,
  symptoms: SYMPTOMS,
  guides: [...REPAIR_GUIDES, ...GUIDE_PLAYER_FIXTURES],
  diagnosticRules: DIAGNOSTIC_RULES,
  sources: GUIDE_SOURCE_REFERENCES,
};
