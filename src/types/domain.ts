import { z } from "zod";
import { bicycleTypeIdSchema, explorerBicycleTypeSchema } from "@/types/bicycle";

export const reviewStatusSchema = z.enum(["draft", "in-review", "reviewed", "published", "retired"]);
export const sourceSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  title: z.string().min(1),
  publisher: z.string().min(1),
  url: z.string().url(),
  accessedAt: z.string().date().optional(),
  notes: z.string().optional(),
});
export const mediaKindSchema = z.enum(["image", "svg", "video", "animation"]);
export const mediaProvenanceSchema = z.enum([
  "first-party", "licensed", "public-domain", "external-reference", "phase-fixture", "unknown",
]);
export const mediaRightsStatusSchema = z.enum([
  "documented", "permission-pending", "not-provided", "not-applicable", "unknown",
]);
export const guideMediaSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  kind: mediaKindSchema,
  src: z.string().min(1),
  alt: z.string().min(1),
  caption: z.string().optional(),
  poster: z.string().optional(),
  transcript: z.string().optional(),
  captionsUrl: z.string().min(1).optional(),
  provenance: mediaProvenanceSchema.optional(),
  rightsStatus: mediaRightsStatusSchema.optional(),
  attribution: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  sourceIds: z.array(z.string()).optional(),
  licenseName: z.string().optional(),
  licenseUrl: z.string().url().optional(),
});
export const guideStepSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  title: z.string().min(1),
  instruction: z.string().min(1),
  checkpoint: z.string().optional(),
  warning: z.string().optional(),
  mediaIds: z.array(z.string()),
});
export const repairGuideSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1),
  summary: z.string().min(1),
  symptomIds: z.array(z.string()),
  componentIds: z.array(z.string()),
  bicycleTypes: z.array(bicycleTypeIdSchema),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  estimatedMinutes: z.number().int().positive(),
  tools: z.array(z.string()),
  parts: z.array(z.string()),
  prerequisites: z.array(z.string()),
  safetyWarnings: z.array(z.string()),
  steps: z.array(guideStepSchema).min(1),
  media: z.array(guideMediaSchema),
  finalChecks: z.array(z.string()).min(1),
  stopConditions: z.array(z.string()),
  sourceIds: z.array(z.string()),
  reviewStatus: reviewStatusSchema,
  reviewedBy: z.string().optional(),
  reviewedAt: z.string().date().optional(),
  lastUpdated: z.string().date(),
});
export const symptomSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  title: z.string().min(1),
  description: z.string().min(1),
  aliases: z.array(z.string()),
  componentIds: z.array(z.string()),
  bicycleTypes: z.array(bicycleTypeIdSchema).optional(),
  severity: z.enum(["low", "moderate", "high", "stop-riding"]),
  safetyNote: z.string().optional(),
  guideIds: z.array(z.string()),
});
export const diagnosticOptionSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  label: z.string().min(1),
  nextQuestionId: z.string().optional(),
  recommendedGuideIds: z.array(z.string()),
  resultNote: z.string().optional(),
  safetyStop: z.boolean().optional(),
});
export const diagnosticQuestionSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  prompt: z.string().min(1),
  helpText: z.string().optional(),
  options: z.array(diagnosticOptionSchema).min(1),
});
export const diagnosticRuleSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  title: z.string().min(1),
  symptomIds: z.array(z.string()).min(1),
  entryQuestionId: z.string(),
  questions: z.array(diagnosticQuestionSchema).min(1),
  stopConditions: z.array(z.string()),
});
export const repairRequestSchema = z.object({
  summary: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(3000),
  bicycleType: explorerBicycleTypeSchema,
  componentId: z.string().trim().min(1).max(80).optional(),
  triedAlready: z.string().trim().max(1500).optional(),
  email: z.union([z.literal(""), z.string().trim().email().max(254)]).optional(),
  wantsReply: z.boolean(),
}).superRefine((request, ctx) => {
  if (request.wantsReply && !request.email) {
    ctx.addIssue({ code: "custom", path: ["email"], message: "An email address is required when requesting a reply." });
  }
});
export const repairRequestRecordSchema = repairRequestSchema.extend({
  id: z.string().uuid(),
  idempotencyKey: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  status: z.enum(["new", "under_review", "planned", "published", "declined"]),
  notificationStatus: z.enum(["not_requested", "pending", "accepted", "delivered", "failed"]),
  notificationAttempts: z.number().int().nonnegative().default(0),
  notificationAttemptedAt: z.string().datetime().nullable().default(null),
  notificationLastError: z.string().max(300).nullable().default(null),
  notificationSuppressedAt: z.string().datetime().nullable().default(null),
});

export type ReviewStatus = z.infer<typeof reviewStatusSchema>;
export type SourceReference = z.infer<typeof sourceSchema>;
export type GuideMedia = z.infer<typeof guideMediaSchema>;
export type RepairGuideStep = z.infer<typeof guideStepSchema>;
export type RepairGuide = z.infer<typeof repairGuideSchema>;
export type Symptom = z.infer<typeof symptomSchema>;
export type DiagnosticOption = z.infer<typeof diagnosticOptionSchema>;
export type DiagnosticQuestion = z.infer<typeof diagnosticQuestionSchema>;
export type DiagnosticRule = z.infer<typeof diagnosticRuleSchema>;
export type RepairRequestInput = z.infer<typeof repairRequestSchema>;
export type RepairRequestRecord = z.infer<typeof repairRequestRecordSchema>;
