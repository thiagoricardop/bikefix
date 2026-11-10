"use client";

import { useMemo, useState } from "react";
import { BICYCLE_TYPES, getBicycleType } from "@/data/bicycle-types/catalog";
import { BICYCLE_COMPONENTS, getComponent } from "@/data/components/catalog";
import { searchBicycleCatalog, normalizeBicycleSearchText } from "@/lib/search/bicycle-search";
import type { BikeTypeId } from "@/types/bicycle";
import type { RepairGuide, Symptom } from "@/types/domain";
import { InteractiveBicycleSvg } from "./interactive-bicycle-svg";

type ReviewedGuideLink = Pick<RepairGuide, "id" | "slug" | "title" | "bicycleTypes">;

const EXPLORER_TYPE_DETAILS: Record<BikeTypeId, { label: string; subtitle: string; badge: string }> = {
  mountain: { label: "Mountain", subtitle: "Wide tires · Trail control · Suspension example", badge: "TRAIL SETUP" },
  road: { label: "Road", subtitle: "Drop bars · Slim tires · Pavement focus", badge: "ROAD SETUP" },
  hybrid: { label: "Hybrid", subtitle: "Flat bars · Everyday riding · Flexible setup", badge: "COMMUTER SETUP" },
  gravel: { label: "Gravel", subtitle: "Drop bars · Wider tires · Mixed terrain", badge: "MIXED-TERRAIN SETUP" },
  ebike: { label: "E-bike", subtitle: "Pedal assist · Battery and drive unit example", badge: "E-ASSIST SETUP" },
};

const DEFAULT_PART: InteractivePartId = "front-brake";
type InteractivePartId =
  | "front-wheel" | "rear-wheel" | "front-brake" | "rear-brake" | "frame" | "fork"
  | "handlebars" | "stem" | "saddle" | "seatpost" | "chain" | "cassette"
  | "rear-derailleur" | "crankset" | "pedals" | "shifters" | "rear-suspension" | "battery" | "motor";

function getAvailablePartIds(type: BikeTypeId): Set<string> {
  const bicycle = getBicycleType(type);
  return new Set(bicycle.componentIds.filter((id) => getComponent(id)?.kind === "part"));
}

function getBreadcrumbs(componentId: string): string[] {
  const result: string[] = [];
  let current = getComponent(componentId);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    result.unshift(current.name);
    current = current.parentId ? getComponent(current.parentId) : undefined;
  }
  return result;
}

export function BicycleExplorer({ reviewedGuides: reviewedGuideIndex = [] }: { reviewedGuides?: ReviewedGuideLink[] } = {}) {
  const [bikeType, setBikeType] = useState<BikeTypeId>("mountain");
  const [isUnsure, setIsUnsure] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState<string>(DEFAULT_PART);
  const [selectedSymptom, setSelectedSymptom] = useState<Symptom | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [listExpanded, setListExpanded] = useState(true);

  const bicycle = getBicycleType(bikeType);
  const typeDetails = EXPLORER_TYPE_DETAILS[bikeType];
  const availableIds = useMemo(() => getAvailablePartIds(bikeType), [bikeType]);
  const searchResults = useMemo(() => searchBicycleCatalog(searchTerm, bikeType), [searchTerm, bikeType]);
  const availableParts = useMemo(() => BICYCLE_COMPONENTS.filter((component) => availableIds.has(component.id)), [availableIds]);
  const selectedPart = getComponent(selectedPartId) ?? getComponent(DEFAULT_PART)!;
  const breadcrumbs = getBreadcrumbs(selectedPart.id);
  const componentNames = useMemo(
    () => Object.fromEntries(BICYCLE_COMPONENTS.map((component) => [component.id, component.name])),
    [],
  );
  const normalizedSearch = normalizeBicycleSearchText(searchTerm);
  const categoryOptions = useMemo(
    () => Array.from(new Set(availableParts.map((component) => component.category))).sort((a, b) => a.localeCompare(b)),
    [availableParts],
  );
  const filteredParts = useMemo(
    () => searchResults.components.map((match) => match.component)
      .filter((component) => categoryFilter === "all" || component.category === categoryFilter),
    [categoryFilter, searchResults],
  );
  const visibleSymptoms = useMemo(
    () => searchResults.symptoms.filter((match) => categoryFilter === "all" || match.componentIds.some((id) => getComponent(id)?.category === categoryFilter)),
    [categoryFilter, searchResults],
  );
  const groupedParts = useMemo(() => {
    const groups = new Map<string, typeof filteredParts>();
    for (const component of filteredParts) {
      const existing = groups.get(component.category) ?? [];
      existing.push(component);
      groups.set(component.category, existing);
    }
    return Array.from(groups.entries());
  }, [filteredParts]);

  function selectBikeType(nextType: BikeTypeId) {
    const nextAvailable = getAvailablePartIds(nextType);
    setBikeType(nextType);
    setIsUnsure(false);
    setSelectedSymptom(null);
    setCategoryFilter("all");
    if (!nextAvailable.has(selectedPartId)) {
      setSelectedPartId(DEFAULT_PART);
    }
  }

  function selectUnsureType() {
    const exampleType: BikeTypeId = "mountain";
    const nextAvailable = getAvailablePartIds(exampleType);
    setBikeType(exampleType);
    setIsUnsure(true);
    setSelectedSymptom(null);
    setCategoryFilter("all");
    if (!nextAvailable.has(selectedPartId)) {
      setSelectedPartId(DEFAULT_PART);
    }
  }

  function selectPart(componentId: string) {
    if (availableIds.has(componentId)) {
      setSelectedPartId(componentId);
      setSelectedSymptom(null);
    }
  }

  function selectSymptom(symptom: Symptom, componentIds: string[]) {
    const firstAvailablePart = componentIds.find((componentId) => availableIds.has(componentId));
    if (!firstAvailablePart) return;
    setSelectedPartId(firstAvailablePart);
    setSelectedSymptom(symptom);
  }

  const selectedIsElectric = selectedPart.id === "battery" || selectedPart.id === "motor";
  const selectedSymptomParts = selectedSymptom
    ? selectedSymptom.componentIds
      .filter((componentId) => availableIds.has(componentId))
      .map((componentId) => getComponent(componentId)?.name)
      .filter((name): name is string => Boolean(name))
    : [];
  const applicableReviewedGuides = reviewedGuideIndex.filter(
    (guide) => selectedPart.guideIds.includes(guide.id) && guide.bicycleTypes.includes(bikeType),
  );

  return (
    <section className="explorer-section" id="interactive-explorer" aria-labelledby="explorer-title">
      <div className="page-shell">
        <div className="section-heading section-heading--split explorer-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-dot" /> THE INTERACTIVE EXPLORER</p>
            <h2 id="explorer-title">Point to the part.<br /><span>Start with what you know.</span></h2>
          </div>
          <p className="section-intro">Choose the closest bicycle type, then select a component on the illustration or in the parts list. You don&apos;t need to know the part&apos;s name to begin.</p>
        </div>

        <div className="explorer-shell">
          <div className="explorer-topbar">
            <div className="explorer-topbar-title">
              <span className="explorer-status-dot" />
              <div>
                <strong>Explore your bicycle</strong>
                <span>Illustrative model · not a model-specific service manual</span>
              </div>
            </div>
            <div className="explorer-steps" aria-label="Explorer steps">
              <span className="explorer-step explorer-step--active"><b>1</b> Choose bike</span>
              <span className="explorer-step"><b>2</b> Select part</span>
              <span className="explorer-step"><b>3</b> Understand it</span>
            </div>
          </div>

          <div className="explorer-type-picker" aria-label="Choose bicycle type">
            {BICYCLE_TYPES.map((type, index) => (
              <button
                key={type.id}
                type="button"
                className={`explorer-type-button${bikeType === type.id && !isUnsure ? " is-active" : ""}`}
                aria-label={`Choose ${type.name}`}
                aria-pressed={bikeType === type.id && !isUnsure}
                onClick={() => selectBikeType(type.id)}
              >
                <span className="explorer-type-number">0{index + 1}</span>
                <span>{EXPLORER_TYPE_DETAILS[type.id].label}</span>
                {bikeType === type.id && !isUnsure && <span className="explorer-type-check" aria-hidden="true">✓</span>}
              </button>
            ))}
            <button
              type="button"
              className={`explorer-type-button explorer-type-button--unsure${isUnsure ? " is-active" : ""}`}
              aria-label="Choose I'm not sure"
              aria-pressed={isUnsure}
              onClick={selectUnsureType}
            >
              <span className="explorer-type-number">?</span>
              <span>I&apos;m not sure</span>
              {isUnsure && <span className="explorer-type-check" aria-hidden="true">✓</span>}
            </button>
          </div>

          <div className="explorer-workspace">
            <div className="explorer-visual-panel">
              <div className="explorer-visual-head">
                <div>
                  <span className="explorer-visual-kicker">{isUnsure ? "STARTING EXAMPLE" : typeDetails.badge}</span>
                  <h3>{isUnsure ? "Mountain bike example" : bicycle.name}</h3>
                  <p>{isUnsure ? "A representative starting point · Actual parts and layouts vary" : typeDetails.subtitle}</p>
                </div>
                <span className="explorer-part-count"><strong>{availableParts.length}</strong> selectable parts</span>
              </div>
              <div className="explorer-canvas">
                <div className="canvas-label canvas-label--top"><span className="canvas-label-dot" /> SELECT A PART</div>
                <div className="canvas-grid" aria-hidden="true" />
                <InteractiveBicycleSvg
                  type={bikeType}
                  selectedPartId={selectedPartId}
                  onSelectPart={selectPart}
                  componentNames={componentNames}
                />
                <div className="canvas-label canvas-label--bottom"><span className="canvas-hint-key">↖</span> Tap a component or use the parts list</div>
              </div>
              <div className="explorer-visual-legend">
                <span><i className="legend-dot legend-dot--selected" /> Selected part</span>
                <span><i className="legend-dot legend-dot--neutral" /> Other components</span>
                <span className="legend-note">Drawing is representative; equipment differs by model.</span>
              </div>
            </div>

            <aside className="explorer-detail-panel" aria-labelledby="selected-part-title" aria-live="polite">
              <div className="detail-panel-topline">
                <span className="detail-eyebrow">YOUR SELECTED PART</span>
                <span className="detail-index">01 / 03</span>
              </div>
              <div className="detail-part-icon" aria-hidden="true">
                <svg viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="1.5" opacity=".22" />
                  <circle cx="32" cy="32" r="18" stroke="currentColor" strokeWidth="3" />
                  <circle cx="32" cy="32" r="7" stroke="currentColor" strokeWidth="2.5" />
                  <path d="M32 14V25M32 39V50M14 32H25M39 32H50M19.3 19.3L27 27M37 37L44.7 44.7M44.7 19.3L37 27M27 37L19.3 44.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  <path d="M13 46C22 57 41 55 49 40" stroke="#99b75c" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </div>
              <div className="detail-breadcrumbs" aria-label="Component hierarchy">
                {breadcrumbs.map((crumb, index) => (
                  <span key={`${crumb}-${index}`}>
                    {index > 0 && <span className="breadcrumb-separator" aria-hidden="true">/</span>}
                    {crumb}
                  </span>
                ))}
              </div>
              <h3 id="selected-part-title">{selectedPart.name}</h3>
              <p className="detail-description">{selectedPart.description}</p>

              {selectedSymptom && (
                <div className={`symptom-reference symptom-reference--${selectedSymptom.severity}`} role="status" aria-live="polite">
                  <div className="symptom-reference-kicker">SYMPTOM REFERENCE · NOT A DIAGNOSIS</div>
                  <h4>{selectedSymptom.title}</h4>
                  <p>{selectedSymptom.description}</p>
                  {selectedSymptom.safetyNote && <p className="symptom-reference-safety"><strong>Safety:</strong> {selectedSymptom.safetyNote}</p>}
                  {selectedSymptomParts.length > 0 && <p className="symptom-reference-related"><strong>Related parts:</strong> {selectedSymptomParts.join(", ")}</p>}
                  <a
                    className="symptom-reference-action"
                    href={`/diagnose?symptom=${encodeURIComponent(selectedSymptom.id)}&bicycleType=${encodeURIComponent(isUnsure ? "unsure" : bikeType)}`}
                  >
                    Start guided symptom check <span aria-hidden="true">↗</span>
                  </a>
                </div>
              )}

              <div className="detail-divider" />
              <div className="detail-section-title"><span>COMMON SIGNS TO NOTICE</span><span>{selectedPart.commonSymptoms.length.toString().padStart(2, "0")}</span></div>
              <div className="symptom-chip-list">
                {selectedPart.commonSymptoms.length > 0 ? selectedPart.commonSymptoms.slice(0, 4).map((symptom) => (
                  <span key={symptom} className="symptom-chip"><span aria-hidden="true">↗</span>{symptom}</span>
                )) : <p className="detail-muted">No symptom notes have been added for this part yet.</p>}
              </div>

              <div className={`detail-safety-note${selectedPart.id === "frame" || selectedIsElectric ? " detail-safety-note--important" : ""}`}>
                <span className="detail-safety-icon" aria-hidden="true">{selectedPart.id === "frame" || selectedIsElectric ? "!" : "i"}</span>
                <p>{selectedPart.id === "frame"
                  ? "Stop riding if you suspect a crack or structural damage. Have the frame assessed by a qualified bicycle mechanic."
                  : selectedIsElectric
                    ? "Do not open a battery pack or attempt internal electrical repairs. Follow the system manufacturer's safety instructions."
                    : "A drawing cannot confirm your installed component type. Check your actual setup before following any adjustment procedure."}</p>
              </div>

              <div className="detail-guide-status">
                <div className="guide-status-icon" aria-hidden="true">↗</div>
                <div>
                  <strong>{applicableReviewedGuides.length > 0 ? "Reviewed guides" : "No reviewed guide yet"}</strong>
                  <p>{applicableReviewedGuides.length > 0
                    ? "Choose a reviewed guide for step-by-step help."
                    : "We're building and reviewing guides for this part. No unreviewed instructions are shown as verified advice."}</p>
                  {applicableReviewedGuides.length > 0 && (
                    <div className="reviewed-guide-links">
                      {applicableReviewedGuides.map((guide) => (
                        <a href={`/guides/${guide.slug}`} key={guide.id}>{guide.title}<span aria-hidden="true">↗</span></a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </aside>

            <div className="explorer-parts-browser">
              <div className="parts-browser-heading">
                <div>
                  <p className="detail-eyebrow">OR BROWSE BY NAME</p>
                  <h3>Find a component</h3>
                  <p>Search part names or a symptom you have noticed.</p>
                </div>
                <button type="button" className="parts-collapse-button" aria-expanded={listExpanded} onClick={() => setListExpanded((current) => !current)}>
                  {listExpanded ? "Hide list" : "Show list"}<span aria-hidden="true">{listExpanded ? "−" : "+"}</span>
                </button>
              </div>
              {listExpanded && (
                <>
                  <label className="parts-search-label" htmlFor="bicycle-part-search">Search parts or symptoms</label>
                  <div className="parts-search-wrap">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.7"/><path d="M16 16L21 21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
                    <input id="bicycle-part-search" type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Try “brake”, “chain”, or “noise”…" />
                    {searchTerm && <button type="button" className="clear-search-button" onClick={() => setSearchTerm("")}>Clear</button>}
                  </div>
                  <div className="parts-category-filters" role="group" aria-label="Filter by component category">
                    <span>Category</span>
                    <button type="button" className={categoryFilter === "all" ? "is-active" : ""} aria-pressed={categoryFilter === "all"} onClick={() => setCategoryFilter("all")}>All categories</button>
                    {categoryOptions.map((category) => (
                      <button type="button" key={category} className={categoryFilter === category ? "is-active" : ""} aria-pressed={categoryFilter === category} onClick={() => setCategoryFilter(category)}>{category}</button>
                    ))}
                  </div>
                  {normalizedSearch && visibleSymptoms.length > 0 && (
                    <section className="symptom-search-results" aria-labelledby="symptom-search-results-title">
                      <div className="symptom-search-results-heading">
                        <h4 id="symptom-search-results-title">Matching symptoms</h4>
                        <span>{visibleSymptoms.length}</span>
                      </div>
                      <div className="symptom-search-results-list">
                        {visibleSymptoms.map(({ symptom, componentIds }) => (
                          <button
                            type="button"
                            className={`symptom-search-result${selectedSymptom?.id === symptom.id ? " is-selected" : ""}`}
                            key={symptom.id}
                            aria-label={`Explore symptom ${symptom.title}`}
                            aria-pressed={selectedSymptom?.id === symptom.id}
                            onClick={() => selectSymptom(symptom, componentIds)}
                          >
                            <span className="symptom-search-result-icon" aria-hidden="true">{symptom.severity === "stop-riding" ? "!" : "↗"}</span>
                            <span className="symptom-search-result-copy">
                              <strong>{symptom.title}</strong>
                              <small>{symptom.description}</small>
                              <span>{componentIds.map((id) => getComponent(id)?.name).filter(Boolean).join(" · ")}</span>
                            </span>
                            <span className="symptom-search-result-action">View reference →</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                  <div className="parts-browser-groups">
                    {groupedParts.map(([category, parts]) => (
                      <section className="parts-category" key={category} aria-label={category}>
                        <h4>{category}<span>{parts.length}</span></h4>
                        <div className="parts-category-grid">
                          {parts.map((component) => (
                            <button
                              type="button"
                              key={component.id}
                              className={`part-option${selectedPartId === component.id ? " is-selected" : ""}`}
                              aria-label={`Select ${component.name}`}
                              aria-pressed={selectedPartId === component.id}
                              onClick={() => selectPart(component.id)}
                            >
                              <span className="part-option-icon" aria-hidden="true">{selectedPartId === component.id ? "✓" : "↗"}</span>
                              <span className="part-option-copy"><strong>{component.name}</strong><small>{component.shortName === component.name ? component.commonSymptoms[0] ?? component.category : component.shortName}</small></span>
                              <span className="part-option-arrow" aria-hidden="true">→</span>
                            </button>
                          ))}
                        </div>
                      </section>
                    ))}
                    {filteredParts.length === 0 && visibleSymptoms.length === 0 && (
                      <div className="parts-empty-state">
                        <span aria-hidden="true">⌕</span>
                        <strong>No matching part found</strong>
                        <p>Try a broader term, such as “wheel”, “brake”, or “shifting”.</p>
                        <button type="button" onClick={() => setSearchTerm("")}>Clear search</button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="explorer-footnote">
          <span aria-hidden="true">ⓘ</span>
          <p><strong>A useful starting point, not a final diagnosis.</strong> Components, brake systems, gearing, and electric-assist layouts differ among models. If a part is damaged or a repair affects steering, braking, frame integrity, or an e-bike battery, stop and get qualified help.</p>
        </div>
      </div>
    </section>
  );
}
