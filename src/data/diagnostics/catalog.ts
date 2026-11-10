import type { DiagnosticRule } from "@/types/domain";

/**
 * Curated, deterministic triage flows. These questions do not establish a
 * mechanical diagnosis; they route users toward safer next steps and reviewed
 * content when that content exists.
 */
export const DIAGNOSTIC_RULES: DiagnosticRule[] = [
  {
    id: "front-brake-rub-check",
    title: "Front brake rubbing check",
    symptomIds: ["front-brake-rubs"],
    entryQuestionId: "braking-effective",
    stopConditions: ["Braking is weak or unpredictable", "Visible damage", "Wheel cannot rotate freely"],
    questions: [
      {
        id: "braking-effective",
        prompt: "Does the front brake still stop the wheel reliably?",
        helpText: "Answer only while the bicycle is stationary; do not test a potentially faulty brake on the road.",
        options: [
          { id: "yes", label: "Yes, braking feels normal", nextQuestionId: "rub-location", recommendedGuideIds: ["inspect-front-brake-rub"], resultNote: "Continue with identifying the installed brake system. This does not establish why it rubs." },
          { id: "no-or-unsure", label: "No, or I am not sure", recommendedGuideIds: [], safetyStop: true, resultNote: "Stop riding. Weak or unpredictable braking needs inspection by a qualified bicycle mechanic before the bicycle is used again." },
        ],
      },
      {
        id: "rub-location",
        prompt: "Where does the rubbing appear to come from?",
        helpText: "Look only with the bicycle stationary. Do not put fingers near moving parts.",
        options: [
          { id: "rim", label: "Near the wheel rim", recommendedGuideIds: ["inspect-front-brake-rub"], resultNote: "The bicycle may use a rim brake. Confirm the actual brake design and inspect for damage before considering a procedure." },
          { id: "disc", label: "Near a disc rotor", recommendedGuideIds: ["adjust-mechanical-disc-brake-rub"], resultNote: "The bicycle may use a disc brake. Confirm whether it is mechanical or hydraulic before choosing any procedure." },
          { id: "unknown", label: "I cannot tell", recommendedGuideIds: [], resultNote: "Do not guess the brake type. Ask a mechanic to identify the system if you cannot do so confidently." },
        ],
      },
    ],
  },
  {
    id: "flat-tire-check",
    title: "Flat tire checks",
    symptomIds: ["flat-tire"],
    entryQuestionId: "tire-air-loss",
    stopConditions: ["The bicycle is being ridden on a flat tire", "A cut, bulge, exposed casing, or wheel damage is visible"],
    questions: [
      {
        id: "tire-air-loss",
        prompt: "What best describes the tire right now?",
        helpText: "Keep the bicycle stationary while checking. Do not ride to test whether it holds air.",
        options: [
          { id: "flat", label: "It is flat or will not hold air", nextQuestionId: "tire-wheel-damage", recommendedGuideIds: [], resultNote: "A puncture or air leak is possible, but the cause has not been confirmed." },
          { id: "slow-loss", label: "It loses air slowly", nextQuestionId: "tire-wheel-damage", recommendedGuideIds: [], resultNote: "A slow leak is possible. This flow cannot distinguish a puncture, valve leak, or another cause." },
          { id: "unknown", label: "I am not sure", recommendedGuideIds: [], safetyStop: true, resultNote: "Do not ride until tire pressure and wheel condition have been checked. Ask a mechanic if you cannot assess them safely." },
        ],
      },
      {
        id: "tire-wheel-damage",
        prompt: "Can you see a cut, bulge, exposed tire casing, or obvious wheel damage?",
        helpText: "Do not remove the tire or handle an embedded object just to answer this question.",
        options: [
          { id: "yes", label: "Yes, there may be visible damage", recommendedGuideIds: [], safetyStop: true, resultNote: "Do not ride the bicycle. Have the tire and wheel assessed by a qualified mechanic; visible structural tire or wheel damage is not suitable for a generic troubleshooting procedure." },
          { id: "no", label: "No obvious damage is visible", recommendedGuideIds: [], resultNote: "A puncture or valve-related leak remains possible. Keep the bicycle off the road until the tire is repaired and pressure retention is checked using the manufacturer's guidance." },
          { id: "unsure", label: "I cannot tell", recommendedGuideIds: [], safetyStop: true, resultNote: "Do not ride while the tire or wheel condition is uncertain. Ask a mechanic to inspect it before use." },
        ],
      },
    ],
  },
  {
    id: "rear-gears-skip-check",
    title: "Rear gears skipping checks",
    symptomIds: ["rear-gears-skip"],
    entryQuestionId: "chain-jump-pattern",
    stopConditions: ["Visible chain or derailleur damage", "The chain skips unpredictably under load", "A derailleur appears bent or may contact the wheel"],
    questions: [
      {
        id: "chain-jump-pattern",
        prompt: "What happens when the problem occurs?",
        helpText: "Do not deliberately recreate a chain skip. Think about what you have already noticed.",
        options: [
          { id: "jumps-or-drops", label: "The chain jumps or drops unexpectedly", nextQuestionId: "drivetrain-visible-damage", recommendedGuideIds: [], resultNote: "An unstable chain can affect control. Avoid riding under load while the cause is uncertain." },
          { id: "slow-shift", label: "Shifting is slow, but the chain stays engaged", nextQuestionId: "shift-pattern", recommendedGuideIds: [], resultNote: "Slow shifting can have several causes. Identify the drivetrain and follow a guide intended for that exact system." },
          { id: "unsure", label: "I cannot describe it clearly", recommendedGuideIds: [], resultNote: "Do not guess at adjustments. A mechanic can observe the symptom and identify the drivetrain configuration." },
        ],
      },
      {
        id: "drivetrain-visible-damage",
        prompt: "Do you see a damaged chain, a visibly bent derailleur, or damaged sprocket teeth?",
        helpText: "Look without turning the pedals or placing hands near the drivetrain.",
        options: [
          { id: "yes", label: "Yes, visible damage may be present", recommendedGuideIds: [], safetyStop: true, resultNote: "Stop riding and arrange a qualified inspection. Do not try to straighten a derailleur or reuse a visibly damaged chain based on a generic guide." },
          { id: "no", label: "No obvious damage is visible", nextQuestionId: "shift-pattern", recommendedGuideIds: [], resultNote: "A lack of visible damage does not rule out wear, misalignment, or a compatibility issue." },
          { id: "unsure", label: "I cannot tell", recommendedGuideIds: [], safetyStop: true, resultNote: "If you cannot rule out drivetrain damage, avoid riding until a qualified mechanic has inspected it." },
        ],
      },
      {
        id: "shift-pattern",
        prompt: "When is the shifting problem most noticeable?",
        options: [
          { id: "one-gear", label: "In one or a few gears", recommendedGuideIds: [], resultNote: "A gear-specific symptom may relate to adjustment, wear, or damage. This answer does not identify which cause applies." },
          { id: "under-load", label: "When pedaling hard or climbing", recommendedGuideIds: [], safetyStop: true, resultNote: "Stop applying force and avoid riding until the drivetrain is inspected. A chain that skips under load can cause a sudden loss of balance." },
          { id: "many-gears", label: "Across many gears, or I cannot tell", recommendedGuideIds: [], resultNote: "Several causes remain possible. Have the drivetrain configuration and condition assessed rather than making an adjustment by guesswork." },
        ],
      },
    ],
  },
  {
    id: "ebike-assist-check",
    title: "E-bike assist safety checks",
    symptomIds: ["ebike-assist-unavailable"],
    entryQuestionId: "ebike-battery-safety",
    stopConditions: ["Battery is swollen, leaking, damaged, unusually hot, or emits an unusual smell", "Electrical damage or exposed wiring is visible"],
    questions: [
      {
        id: "ebike-battery-safety",
        prompt: "Is the battery swollen, damaged, leaking, unusually hot, or giving off an unusual smell?",
        helpText: "Do not open the battery, connect diagnostic tools, or charge it to test for a fault.",
        options: [
          { id: "yes", label: "Yes, one of these signs is present", recommendedGuideIds: [], safetyStop: true, resultNote: "Stop using and do not charge the e-bike. Do not open, puncture, or attempt to repair the battery. Follow the system manufacturer's emergency guidance and contact qualified service." },
          { id: "no", label: "No, none of these signs is present", nextQuestionId: "ebike-display-warning", recommendedGuideIds: [], resultNote: "Continue only with external checks that the bicycle/system manufacturer documents for users." },
          { id: "unsure", label: "I am not sure", recommendedGuideIds: [], safetyStop: true, resultNote: "Do not charge or use the system until its condition has been assessed by qualified e-bike service." },
        ],
      },
      {
        id: "ebike-display-warning",
        prompt: "Does the display or controller show a warning or error code?",
        options: [
          { id: "yes", label: "Yes, a warning or code appears", recommendedGuideIds: [], resultNote: "Record the code and consult the exact drive-system manufacturer's user manual or an authorized service provider. Do not guess at the meaning of an undocumented code." },
          { id: "no", label: "No warning is shown", recommendedGuideIds: [], resultNote: "The cause is still uncertain. Check only manufacturer-approved external controls and charging connections; do not open the battery, motor, or controller." },
          { id: "unsure", label: "I cannot tell", recommendedGuideIds: [], resultNote: "Use the system manufacturer's manual to identify the display and warning indicators, or contact qualified e-bike service." },
        ],
      },
    ],
  },
];
