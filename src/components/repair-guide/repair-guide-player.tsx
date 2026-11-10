"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RepairGuide, SourceReference } from "@/types/domain";
import { GuideMediaPanel } from "@/components/repair-guide/guide-media";

function hasReviewEvidence(guide: RepairGuide, sources: SourceReference[]): boolean {
  const sourceIds = new Set(sources.map((source) => source.id));
  return Boolean(
    guide.reviewedBy?.trim() &&
    guide.reviewedAt &&
    guide.sourceIds.length > 0 &&
    guide.sourceIds.every((id) => sourceIds.has(id)),
  );
}

function hasPublishableMediaRights(guide: RepairGuide): boolean {
  return guide.media.every((media) => {
    if (media.rightsStatus === "not-applicable") return true;
    if (media.rightsStatus !== "documented") return false;
    return Boolean(
      media.attribution?.trim() || media.sourceUrl?.trim() || media.licenseName?.trim() || media.sourceIds?.length,
    );
  });
}

function statusCopy(guide: RepairGuide, sources: SourceReference[]): { label: string; explanation: string; className: string } {
  const hasEvidence = hasReviewEvidence(guide, sources);
  if (guide.reviewStatus === "published") {
    if (!hasEvidence || !hasPublishableMediaRights(guide)) {
      return { label: "Publication record incomplete · not verified", explanation: "This record is marked published, but required review evidence or media-rights details are missing. Do not rely on it as approved repair advice.", className: "guide-status--draft" };
    }
    return { label: "Published", explanation: `Review recorded by ${guide.reviewedBy} on ${guide.reviewedAt}. Source references are listed below. Always confirm applicability to your exact bicycle model.`, className: "guide-status--published" };
  }
  if (guide.reviewStatus === "reviewed") {
    if (!hasEvidence) return { label: "Review record incomplete · not verified", explanation: "This record is marked reviewed, but reviewer, date, or resolvable source references are missing. Do not rely on it as approved repair advice.", className: "guide-status--draft" };
    return { label: "Reviewed · not marked published", explanation: `Review recorded by ${guide.reviewedBy} on ${guide.reviewedAt}. This guide is not marked published.`, className: "guide-status--reviewed" };
  }
  if (guide.reviewStatus === "in-review") return { label: "In review", explanation: "This guide is being reviewed and must not be treated as approved repair advice.", className: "guide-status--draft" };
  if (guide.reviewStatus === "retired") return { label: "Retired", explanation: "This guide is retired. Do not use it as current repair instructions.", className: "guide-status--retired" };
  return { label: "Draft · not verified repair advice", explanation: guide.sourceIds.length > 0 ? "Technical references are listed below, but a qualified mechanic has not reviewed this procedure. Treat it as an editorial draft, not approved repair advice." : "This fixture has not been mechanically reviewed and has no technical source references. It exists to exercise the guide player, not as a repair procedure.", className: "guide-status--draft" };
}

function BikeLabel({ value }: { value: string }) {
  const labels: Record<string, string> = { road: "Road", mountain: "Mountain", hybrid: "Hybrid / commuter", gravel: "Gravel", ebike: "E-bike" };
  return <span className="guide-chip" key={value}>{labels[value] ?? value}</span>;
}

export function RepairGuidePlayer({ guide, sources }: { guide: RepairGuide; sources: SourceReference[] }) {
  const [view, setView] = useState<"overview" | "steps" | "final" | "finished">("overview");
  const [stepIndex, setStepIndex] = useState(0);
  const [checkpointState, setCheckpointState] = useState<Record<string, boolean>>({});
  const [finalCheckState, setFinalCheckState] = useState<Record<string, boolean>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const review = statusCopy(guide, sources);
  const currentStep = guide.steps[stepIndex];
  const mediaById = useMemo(() => new Map(guide.media.map((media) => [media.id, media])), [guide.media]);
  const linkedSources = useMemo(() => {
    const byId = new Map(sources.map((source) => [source.id, source]));
    return guide.sourceIds.map((id) => byId.get(id)).filter((source): source is SourceReference => Boolean(source));
  }, [guide.sourceIds, sources]);
  const completedFinalChecks = guide.finalChecks.filter((_, index) => finalCheckState[`${guide.id}-final-${index}`]).length;

  useEffect(() => {
    headingRef.current?.focus();
  }, [view, stepIndex]);

  function resetProgress() {
    setView("overview");
    setStepIndex(0);
    setCheckpointState({});
    setFinalCheckState({});
  }

  function goBack() {
    if (view === "steps" && stepIndex > 0) setStepIndex((index) => index - 1);
    else if (view === "steps") setView("overview");
    else if (view === "final") {
      setView("steps");
      setStepIndex(guide.steps.length - 1);
    } else if (view === "finished") setView("final");
    else setView("overview");
  }

  const progressMax = guide.steps.length + 1;

  return (
    <div className="guide-page page-shell">
      <nav className="guide-breadcrumbs" aria-label="Breadcrumb">
        <Link href="/guides">Repair library</Link><span aria-hidden="true">/</span><span>{guide.title}</span>
      </nav>

      <header className="guide-page-heading">
        <p className="eyebrow">REPAIR GUIDE · {guide.difficulty.toUpperCase()}</p>
        <h1>{guide.title}</h1>
        <p>{guide.summary}</p>
        <div className="guide-meta-row" aria-label="Guide details">
          <span>{guide.estimatedMinutes} min estimate</span><span aria-hidden="true">·</span>
          <span>{guide.steps.length} steps</span><span aria-hidden="true">·</span>
          <span>Updated {guide.lastUpdated}</span>
        </div>
      </header>

      <aside className={`guide-status ${review.className}`} aria-label={`Content status: ${review.label}`}>
        <span className="guide-status-mark" aria-hidden="true">{review.className === "guide-status--published" ? "✓" : "!"}</span>
        <div><strong>{review.label}</strong><p>{review.explanation}</p></div>
      </aside>

      {view === "overview" && (
        <section className="guide-overview-card" aria-labelledby="guide-overview-title">
          <div className="guide-overview-main">
            <p className="eyebrow">BEFORE YOU BEGIN</p>
            <h2 id="guide-overview-title" tabIndex={-1} ref={headingRef}>Guide overview</h2>
            <p className="guide-overview-summary">Check the scope, requirements, and stop conditions before opening the steps.</p>
            <div className="guide-detail-grid">
              <section aria-labelledby="guide-applicability-title">
                <h3 id="guide-applicability-title">Bicycle types</h3>
                <div className="guide-chip-row">{guide.bicycleTypes.length ? guide.bicycleTypes.map((type) => <BikeLabel value={type} key={type} />) : <p>Applicability not specified.</p>}</div>
                <h3>Related components</h3>
                <div className="guide-chip-row">{guide.componentIds.map((id) => <span className="guide-chip" key={id}>{id.replaceAll("-", " ")}</span>)}</div>
                <h3>Related symptoms</h3>
                <div className="guide-chip-row">{guide.symptomIds.map((id) => <Link className="guide-chip guide-chip--link" href={`/diagnose?symptom=${encodeURIComponent(id)}`} key={id}>{id.replaceAll("-", " ")}</Link>)}</div>
              </section>
              <section aria-labelledby="guide-requirements-title">
                <h3 id="guide-requirements-title">Tools and parts</h3>
                <p>{guide.tools.length ? guide.tools.join(", ") : "No tools listed for this fixture."}</p>
                <p>{guide.parts.length ? guide.parts.join(", ") : "No replacement parts listed."}</p>
                <h3>Prerequisites</h3>
                {guide.prerequisites.length ? <ul>{guide.prerequisites.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No prerequisites recorded.</p>}
              </section>
            </div>
          </div>

          {guide.safetyWarnings.length > 0 && (
            <section className="guide-safety-panel" aria-labelledby="guide-safety-title">
              <span className="guide-safety-icon" aria-hidden="true">!</span>
              <div><h3 id="guide-safety-title">Read these safety notes</h3><ul>{guide.safetyWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>
            </section>
          )}

          {guide.stopConditions.length > 0 && (
            <section className="guide-stop-panel" aria-labelledby="guide-stop-title">
              <h3 id="guide-stop-title">Stop and get help if</h3>
              <ul>{guide.stopConditions.map((condition) => <li key={condition}>{condition}</li>)}</ul>
            </section>
          )}

          <section className="guide-sources-block" aria-labelledby="guide-sources-title">
            <h3 id="guide-sources-title">Sources and media credits</h3>
            {linkedSources.length ? (
              <ul>{linkedSources.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a> — {source.publisher}{source.notes ? ` · ${source.notes}` : ""}</li>)}</ul>
            ) : <p>No technical source references are attached to this draft. Do not treat it as verified guidance.</p>}
            {guide.media.length > 0 && <p>Media provenance and rights notes are shown alongside each media item.</p>}
          </section>

          <div className="guide-overview-actions">
            <button type="button" className="button button--dark" onClick={() => setView("steps")}>{stepIndex > 0 || Object.values(checkpointState).some(Boolean) ? "Continue guide" : "Start guide"}<span aria-hidden="true"> →</span></button>
            <Link className="button button--quiet" href="/guides">Back to library</Link>
          </div>
        </section>
      )}

      {view === "steps" && currentStep && (
        <section className="guide-player-card" aria-labelledby="current-step-title">
          <div className="guide-player-topline">
            <span className="guide-step-number">STEP {String(stepIndex + 1).padStart(2, "0")} / {String(guide.steps.length).padStart(2, "0")}</span>
            <span className="guide-step-progress-copy">{Math.round(((stepIndex + 1) / progressMax) * 100)}% of guide</span>
          </div>
          <progress className="guide-progress" value={stepIndex + 1} max={progressMax} aria-label="Guide progress" />
          <div className="guide-player-layout">
            <aside className="guide-step-nav" aria-label="Guide steps">
              <h2>Steps</h2>
              <ol>
                {guide.steps.map((step, index) => {
                  const available = index <= stepIndex;
                  const checkpointDone = Boolean(checkpointState[`${guide.id}-${step.id}`]);
                  return <li key={step.id}>
                    <button type="button" disabled={!available} aria-current={index === stepIndex ? "step" : undefined} onClick={() => setStepIndex(index)}>
                      <span className="guide-step-nav-num">{checkpointDone ? "✓" : String(index + 1).padStart(2, "0")}</span>
                      <span>{step.title}</span>
                    </button>
                  </li>;
                })}
                <li className="guide-final-nav-item" aria-label={`Final checks: ${completedFinalChecks} of ${guide.finalChecks.length} complete`}><span className="guide-step-nav-num">{completedFinalChecks === guide.finalChecks.length ? "✓" : "○"}</span><span>Final checks</span></li>
              </ol>
              <button className="guide-reset-link" type="button" onClick={resetProgress}>Restart from the beginning</button>
            </aside>

            <article className="guide-step-content">
              <h2 id="current-step-title" tabIndex={-1} ref={headingRef}>{currentStep.title}</h2>
              <p className="guide-step-instruction">{currentStep.instruction}</p>
              {currentStep.warning && <div className="guide-inline-warning"><strong>Pause here</strong><p>{currentStep.warning}</p></div>}
              {currentStep.mediaIds.length > 0 ? (
                <div className="guide-step-media-stack">
                  {currentStep.mediaIds.map((mediaId) => {
                    const media = mediaById.get(mediaId);
                    return media ? <GuideMediaPanel key={media.id} media={media} /> : <p className="guide-inline-warning" key={mediaId}>This guide references media that is not available. The written instruction remains available.</p>;
                  })}
                </div>
              ) : <p className="guide-no-media-note">No media is supplied for this step. The written draft remains visible; source and review status still apply.</p>}
              {currentStep.checkpoint && (
                <label className="guide-checkpoint">
                  <input type="checkbox" checked={Boolean(checkpointState[`${guide.id}-${currentStep.id}`])} onChange={(event) => setCheckpointState((state) => ({ ...state, [`${guide.id}-${currentStep.id}`]: event.target.checked }))} />
                  <span><strong>Checkpoint</strong>{currentStep.checkpoint}</span>
                </label>
              )}
              <div className="guide-step-actions">
                <button type="button" className="button button--quiet" onClick={goBack}>← {stepIndex === 0 ? "Overview" : "Previous step"}</button>
                <button type="button" className="button button--dark" onClick={() => { if (stepIndex < guide.steps.length - 1) setStepIndex((index) => index + 1); else setView("final"); }}>{stepIndex < guide.steps.length - 1 ? "Next step" : "Review final checks"} <span aria-hidden="true">→</span></button>
              </div>
            </article>
          </div>
        </section>
      )}

      {view === "final" && (
        <section className="guide-final-card" aria-labelledby="guide-final-title">
          <p className="eyebrow">LAST STEP</p>
          <h2 id="guide-final-title" tabIndex={-1} ref={headingRef}>Review the final checks</h2>
          <p className="guide-final-intro">These are reminders to review—not a certification that your bicycle is safe. Leave any item unchecked if you cannot confirm it.</p>
          <div className="guide-final-checklist">
            {guide.finalChecks.map((check, index) => {
              const id = `${guide.id}-final-${index}`;
              return <label className="guide-final-check" key={id}>
                <input type="checkbox" checked={Boolean(finalCheckState[id])} onChange={(event) => setFinalCheckState((state) => ({ ...state, [id]: event.target.checked }))} />
                <span>{check}</span>
              </label>;
            })}
          </div>
          <aside className="guide-final-safety-note"><strong>This checklist does not guarantee safety.</strong><p>If braking, steering, wheels, tires, frame, or electrical systems remain uncertain or appear damaged, do not ride until a qualified mechanic has assessed the issue.</p></aside>
          <div className="guide-step-actions">
            <button type="button" className="button button--quiet" onClick={goBack}>← Previous step</button>
            <button type="button" className="button button--dark" onClick={() => setView("finished")}>Finish reading <span aria-hidden="true">✓</span></button>
          </div>
        </section>
      )}

      {view === "finished" && (
        <section className="guide-finished-card" aria-labelledby="guide-finished-title">
          <span className="guide-finished-mark" aria-hidden="true">✓</span>
          <p className="eyebrow">END OF GUIDE</p>
          <h2 id="guide-finished-title" tabIndex={-1} ref={headingRef}>You reached the end</h2>
          <p>You checked {completedFinalChecks} of {guide.finalChecks.length} final reminders. Your progress is kept while this page remains open.</p>
          <p className="guide-final-safety-note-inline">Completing a guide or checklist does not certify the bicycle as safe.</p>
          <div className="guide-step-actions"><button className="button button--quiet" type="button" onClick={goBack}>Review final checks</button><button className="button button--dark" type="button" onClick={resetProgress}>Start again</button></div>
        </section>
      )}

      <footer className="guide-page-footer"><Link href="/guides">← Back to the repair library</Link><span>Last updated {guide.lastUpdated}</span></footer>
    </div>
  );
}
