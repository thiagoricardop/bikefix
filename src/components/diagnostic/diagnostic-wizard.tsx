"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SYMPTOMS } from "@/data/symptoms/catalog";
import { getDiagnosisView, type DiagnosticAnswers, type DiagnosisView } from "@/lib/diagnostics/deterministic-diagnosis";
import type { ExplorerBicycleType } from "@/types/bicycle";

const BICYCLE_TYPE_CHOICES: Array<{ id: ExplorerBicycleType; label: string }> = [
  { id: "road", label: "Road bike" },
  { id: "mountain", label: "Mountain bike" },
  { id: "hybrid", label: "Hybrid / commuter" },
  { id: "gravel", label: "Gravel bike" },
  { id: "ebike", label: "E-bike" },
  { id: "unsure", label: "I'm not sure" },
];

function isBicycleType(value: string | undefined): value is ExplorerBicycleType {
  return BICYCLE_TYPE_CHOICES.some((choice) => choice.id === value);
}

function answerFor(path: string[], answers: DiagnosticAnswers): DiagnosticAnswers {
  return Object.fromEntries(path.filter((questionId) => answers[questionId]).map((questionId) => [questionId, answers[questionId]]));
}

export function DiagnosticWizard({
  initialSymptomId,
  initialBicycleType,
}: {
  initialSymptomId?: string;
  initialBicycleType?: string;
}) {
  const [symptomId, setSymptomId] = useState(() => SYMPTOMS.some((symptom) => symptom.id === initialSymptomId) ? initialSymptomId! : "");
  const [bicycleType, setBicycleType] = useState<ExplorerBicycleType>(isBicycleType(initialBicycleType) ? initialBicycleType : "unsure");
  const [answers, setAnswers] = useState<DiagnosticAnswers>({});

  const view = useMemo<DiagnosisView | null>(() => symptomId
    ? getDiagnosisView({ symptomId, bicycleType, answers })
    : null, [symptomId, bicycleType, answers]);

  function changeSymptom(nextSymptomId: string) {
    setSymptomId(nextSymptomId);
    setAnswers({});
  }

  function changeBicycleType(nextType: string) {
    if (!isBicycleType(nextType)) return;
    setBicycleType(nextType);
    setAnswers({});
  }

  function chooseAnswer(optionId: string) {
    if (view?.kind !== "question") return;
    const priorAnswers = answerFor(view.questionPath.slice(0, -1), answers);
    setAnswers({ ...priorAnswers, [view.question.id]: optionId });
  }

  function goBack() {
    if (!view || !("questionPath" in view) || view.questionPath.length === 0) return;
    const keepCount = view.kind === "question" ? Math.max(0, view.questionPath.length - 2) : Math.max(0, view.questionPath.length - 1);
    setAnswers(answerFor(view.questionPath.slice(0, keepCount), answers));
  }

  function restart() {
    setAnswers({});
  }

  return (
    <main id="main-content" className="diagnosis-page page-shell">
      <header className="diagnosis-heading">
        <p className="eyebrow"><span className="eyebrow-dot" /> GUIDED SYMPTOM CHECK</p>
        <h1>Find a safer <span>next step.</span></h1>
        <p>Answer a few specific questions based on what you have noticed. This deterministic guide narrows next steps; it does not confirm a mechanical diagnosis or certify that a bicycle is safe.</p>
      </header>

      <section className="diagnosis-setup" aria-label="Choose symptom and bicycle type">
        <div className="diagnosis-field">
          <label htmlFor="diagnosis-symptom">What have you noticed?</label>
          <select id="diagnosis-symptom" value={symptomId} onChange={(event) => changeSymptom(event.target.value)}>
            <option value="">Choose a symptom</option>
            {SYMPTOMS.map((symptom) => <option value={symptom.id} key={symptom.id}>{symptom.title}</option>)}
          </select>
        </div>
        <div className="diagnosis-field">
          <label htmlFor="diagnosis-bike-type">Which bicycle do you have?</label>
          <select id="diagnosis-bike-type" value={bicycleType} onChange={(event) => changeBicycleType(event.target.value)}>
            {BICYCLE_TYPE_CHOICES.map((choice) => <option value={choice.id} key={choice.id}>{choice.label}</option>)}
          </select>
        </div>
      </section>

      <section className="diagnosis-workspace" aria-label="Diagnostic questions and result" aria-live="polite" aria-atomic="true">
        {!view && (
          <div className="diagnosis-intro-state">
            <span className="diagnosis-state-icon" aria-hidden="true">?</span>
            <h2>Start with what you know</h2>
            <p>Choose the closest symptom above. If the problem could affect steering, braking, frame integrity, or an e-bike battery, stop and seek qualified help rather than continuing to troubleshoot.</p>
          </div>
        )}

        {view?.kind === "invalid-symptom" && (
          <div className="diagnosis-result diagnosis-result--caution">
            <span className="diagnosis-result-kicker">SYMPTOM NOT FOUND</span>
            <h2>Choose a listed symptom</h2>
            <p>{view.message}</p>
          </div>
        )}

        {view?.kind === "question" && (
          <div className="diagnosis-question-card">
            <div className="diagnosis-card-topline">
              <span className="diagnosis-result-kicker">{view.symptom.title}</span>
              <span className="diagnosis-step-count">Question {view.progressIndex} of {view.rule.questions.length}</span>
            </div>
            <div className="diagnosis-progress" role="progressbar" aria-label="Diagnostic question progress" aria-valuemin={1} aria-valuemax={view.rule.questions.length} aria-valuenow={view.progressIndex}>
              <span style={{ width: `${Math.min(100, (view.progressIndex / view.rule.questions.length) * 100)}%` }} />
            </div>
            <h2>{view.question.prompt}</h2>
            {view.question.helpText && <p className="diagnosis-help-text">{view.question.helpText}</p>}
            <div className="diagnosis-answer-list" role="group" aria-label="Answer options">
              {view.question.options.map((option) => (
                <button key={option.id} type="button" className="diagnosis-answer-option" onClick={() => chooseAnswer(option.id)}>
                  <span>{option.label}</span><span className="diagnosis-answer-arrow" aria-hidden="true">→</span>
                </button>
              ))}
            </div>
            <div className="diagnosis-question-actions">
              {view.questionPath.length > 1
                ? <button type="button" className="diagnosis-text-button" onClick={goBack}>← Previous question</button>
                : <span />}
              <button type="button" className="diagnosis-text-button" onClick={restart}>Start over</button>
            </div>
          </div>
        )}

        {view?.kind === "result" && (
          <div className="diagnosis-result">
            <span className="diagnosis-result-kicker">NEXT STEP · NOT A CONFIRMED DIAGNOSIS</span>
            <h2>What your answers suggest</h2>
            <p>{view.resultNote}</p>
            <p className="diagnosis-safety-note">{view.symptom.safetyNote ?? "If the condition affects control, braking, steering, or structural integrity, stop riding and seek qualified help."}</p>
            {view.recommendations.length > 0 ? (
              <div className="diagnosis-guide-list" aria-label="Reviewed guide recommendations">
                <h3>Reviewed guides that may help</h3>
                {view.recommendations.map(({ guide, relevance, applicabilityNote }) => (
                  <article className="diagnosis-guide-card" key={guide.id}>
                    <h4><Link href={`/guides/${guide.slug}`}>{guide.title}<span aria-hidden="true"> ↗</span></Link></h4>
                    <p>{relevance}</p>
                    {applicabilityNote && <p className="diagnosis-help-text">{applicabilityNote}</p>}
                  </article>
                ))}
              </div>
            ) : (
              <div className="diagnosis-no-guide">
                <strong>No reviewed guide is available for this scenario yet.</strong>
                <p>Draft content is not presented as verified repair advice. Keep the bicycle stationary when safety is uncertain and consult the manufacturer&apos;s information or a qualified mechanic.</p>
              </div>
            )}
            <div className="diagnosis-question-actions">
              {view.questionPath.length > 0
                ? <button type="button" className="diagnosis-text-button" onClick={goBack}>← Review previous answer</button>
                : <span />}
              <button type="button" className="button button--dark" onClick={restart}>Start over</button>
            </div>
          </div>
        )}

        {view?.kind === "safety-stop" && (
          <div className="diagnosis-result diagnosis-result--stop">
            <span className="diagnosis-result-kicker">SAFETY STOP</span>
            <h2>{view.title}</h2>
            <p>{view.message}</p>
            {view.questionPath.length > 0 && <button type="button" className="diagnosis-text-button" onClick={goBack}>← Review previous answer</button>}
            <div className="diagnosis-stop-reminder"><strong>Do not continue this troubleshooting flow as a repair procedure.</strong><span>Choose another symptom only if it is unrelated to this safety concern; a checklist cannot certify that the bicycle is safe.</span></div>
          </div>
        )}

        {view?.kind === "needs-bike-type" && (
          <div className="diagnosis-result diagnosis-result--caution">
            <span className="diagnosis-result-kicker">CONFIRM THE CONFIGURATION</span>
            <h2>First, confirm this is an e-bike</h2>
            <p>{view.message}</p>
          </div>
        )}

        {view?.kind === "not-applicable" && (
          <div className="diagnosis-result diagnosis-result--caution">
            <span className="diagnosis-result-kicker">CHECK THE BICYCLE TYPE</span>
            <h2>This flow does not match the selected bicycle</h2>
            <p>{view.message}</p>
          </div>
        )}

        {view?.kind === "not-configured" && (
          <div className="diagnosis-result diagnosis-result--caution">
            <span className="diagnosis-result-kicker">NO CURATED FLOW YET</span>
            <h2>We will not guess at the cause</h2>
            <p>{view.message}</p>
          </div>
        )}
      </section>

      <footer className="diagnosis-footer-note">
        <strong>BikeFix is educational guidance, not a safety inspection.</strong>
        <span>Stop if you find damage or if you are not sure a bicycle can be used safely. No percentage certainty or automatic diagnosis is generated.</span>
        <Link href="/#interactive-explorer">Back to the bicycle explorer ↗</Link>
      </footer>
    </main>
  );
}
