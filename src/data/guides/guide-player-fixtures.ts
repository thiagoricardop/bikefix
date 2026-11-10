import type { RepairGuide } from "@/types/domain";

/**
 * Phase 06 player fixtures only. These records are deliberately kept separate
 * from REPAIR_GUIDES so they cannot be recommended as ordinary repair content.
 * All are drafts; the missing media paths are deliberate fallback test cases,
 * not completed or licensed production assets.
 */
export const GUIDE_PLAYER_FIXTURES: RepairGuide[] = [
  {
    id: "phase06-brake-inspection-fixture",
    slug: "phase-06-brake-inspection",
    title: "Brake inspection walkthrough (player fixture)",
    summary: "A cautious visual-inspection walkthrough used to verify the repair-guide player. It does not provide brake-adjustment instructions.",
    symptomIds: ["front-brake-rubs"],
    componentIds: ["front-brake", "front-wheel"],
    bicycleTypes: ["road", "mountain", "hybrid", "gravel", "ebike"],
    difficulty: "beginner",
    estimatedMinutes: 5,
    tools: [],
    parts: [],
    prerequisites: [
      "Keep the bicycle stationary during this inspection.",
      "Identify the actual brake system before looking for system-specific instructions.",
    ],
    safetyWarnings: [
      "If braking is weak, the wheel is obstructed, or damage or loose mounting is visible, do not ride; seek a qualified mechanic.",
      "Do not loosen fasteners or adjust the brake as part of this draft inspection.",
    ],
    steps: [
      {
        id: "keep-bike-stationary",
        title: "Make the area safe to inspect",
        instruction: "Park the bicycle on stable ground. Keep your hands clear of moving parts and do not spin the wheel during this walkthrough.",
        checkpoint: "The bicycle is stationary and stable.",
        warning: "Do not continue if the wheel is obstructed or the bicycle cannot be kept stable.",
        mediaIds: [],
      },
      {
        id: "look-for-visible-contact",
        title: "Look for visible contact or damage",
        instruction: "Without turning the wheel or loosening anything, look at the brake and wheel area. Note whether anything appears to touch unexpectedly and whether any part looks damaged or loose.",
        checkpoint: "You can describe what you observed without guessing at the cause.",
        warning: "If damage, loose mounting, or an obstructed wheel is visible, stop here and seek a qualified mechanic.",
        mediaIds: ["brake-inspection-photo-fixture"],
      },
      {
        id: "identify-brake-design",
        title: "Identify the installed brake design",
        instruction: "Look for whether the brake pads act on the wheel rim or on a disc rotor. If you cannot tell, record that as unknown and ask a mechanic rather than trying an adjustment.",
        checkpoint: "The brake type is identified, or explicitly recorded as unknown.",
        mediaIds: [],
      },
    ],
    media: [
      {
        id: "brake-inspection-photo-fixture",
        kind: "image",
        src: "/media/guide-player-fixtures/brake-inspection-photo-not-provided.webp",
        alt: "Optional brake inspection reference photo; no media file is supplied with this draft fixture.",
        caption: "No reference photo is supplied for this fixture. The written step remains available.",
        provenance: "phase-fixture",
        rightsStatus: "not-provided",
      },
    ],
    finalChecks: [
      "I recorded the brake type or left it explicitly unknown.",
      "I did not adjust or loosen any brake fasteners during this inspection.",
      "If braking is impaired or damage is suspected, I will not ride until a qualified mechanic has inspected the bicycle.",
    ],
    stopConditions: [
      "Weak or unpredictable braking.",
      "Visible damage, loose mounting, or a wheel that cannot rotate freely.",
      "Uncertain brake-system identification before any system-specific work.",
    ],
    sourceIds: [],
    reviewStatus: "draft",
    lastUpdated: "2026-10-29",
  },
  {
    id: "phase06-flat-tire-media-fixture",
    slug: "phase-06-flat-tire-media-fallback",
    title: "Flat-tire inspection media fallback",
    summary: "A draft fixture for testing video, captions, transcript, and unavailable-media states. It does not teach tire removal or repair.",
    symptomIds: ["flat-tire"],
    componentIds: ["front-wheel", "rear-wheel"],
    bicycleTypes: ["road", "mountain", "hybrid", "gravel", "ebike"],
    difficulty: "beginner",
    estimatedMinutes: 3,
    tools: [],
    parts: [],
    prerequisites: ["Do not ride the bicycle while a tire is flat."],
    safetyWarnings: [
      "Do not ride on a flat tire.",
      "If the tire, rim, or wheel appears damaged, stop and ask a qualified mechanic to assess it.",
    ],
    steps: [
      {
        id: "flat-tire-observation-only",
        title: "Record what you can observe safely",
        instruction: "Keep the bicycle stationary. Note which tire has lost air and whether damage is visible. This fixture intentionally stops short of tire removal, patching, inflation, or wheel-installation procedures.",
        checkpoint: "The affected wheel and any obvious damage have been described without disassembling the bicycle.",
        warning: "Do not ride on a flat tire or continue if wheel damage is suspected.",
        mediaIds: ["flat-tire-video-fixture"],
      },
    ],
    media: [
      {
        id: "flat-tire-video-fixture",
        kind: "video",
        src: "/media/guide-player-fixtures/flat-tire-video-not-provided.mp4",
        alt: "Optional flat-tire inspection video; no video file is supplied with this draft fixture.",
        poster: "/media/guide-player-fixtures/flat-tire-poster-not-provided.webp",
        caption: "No video is supplied. Use the written instruction above instead.",
        captionsUrl: "/media/guide-player-fixtures/flat-tire-captions-not-provided.vtt",
        transcript: "No verified transcript is available because this fixture has no video asset. The written instruction on this page is the available guidance.",
        provenance: "phase-fixture",
        rightsStatus: "not-provided",
      },
    ],
    finalChecks: [
      "The bicycle has remained stationary while the tire is flat.",
      "Any suspected tire or wheel damage will be checked by a qualified mechanic.",
    ],
    stopConditions: ["A flat tire", "Visible tire or wheel damage", "Uncertainty about safe wheel condition"],
    sourceIds: [],
    reviewStatus: "draft",
    lastUpdated: "2026-10-29",
  },
];
