import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { BICYCLE_COMPONENTS } from "@/data/components/catalog";
import { notifyDeveloperOfRepairRequest } from "@/lib/notifications/repair-request-notifier";
import { DuplicateSubmissionInProgressError, FileRepairRequestStore } from "@/lib/persistence/file-repair-request-store";
import { getRepairRequestWorkflowConfig } from "@/lib/repair-requests/config";
import { checkRepairRequestRateLimit, hashClientIdentifier } from "@/lib/repair-requests/rate-limit";
import { resolveClientIdentifier } from "@/lib/repair-requests/client-identity";
import { repairRequestSchema, type RepairRequestRecord } from "@/types/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 16 * 1024;
const componentIds = new Set(BICYCLE_COMPONENTS.map((component) => component.id));

function jsonError(status: number, code: string, message: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, code, message, ...extra }, { status, headers: { "Cache-Control": "no-store" } });
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Non-browser clients need not send Origin; no cookies/auth are used by this endpoint.
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}

type LimitedBodyResult =
  | { kind: "ok"; raw: string }
  | { kind: "too-large" }
  | { kind: "invalid-length" }
  | { kind: "read-error" };

/** Read the body incrementally so a missing/spoofed Content-Length cannot bypass the size cap. */
async function readLimitedBody(request: NextRequest): Promise<LimitedBodyResult> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) return { kind: "invalid-length" };
    if (Number(contentLength) > MAX_BODY_BYTES) return { kind: "too-large" };
  }
  if (!request.body) return { kind: "ok", raw: "" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { kind: "too-large" };
      }
      chunks.push(value);
    }
  } catch {
    return { kind: "read-error" };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { kind: "ok", raw: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return { kind: "read-error" };
  }
}

export async function POST(request: NextRequest) {
  const config = getRepairRequestWorkflowConfig();
  if (!config.enabled) {
    return jsonError(503, "submissions_disabled", "Repair-guide submissions are not enabled for this deployment. No request was saved.");
  }
  if (!sameOrigin(request)) return jsonError(403, "origin_rejected", "This request could not be submitted from this origin.");
  if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
    return jsonError(415, "unsupported_content_type", "Submit this form using the BikeFix request form.");
  }

  const clientIdentity = resolveClientIdentifier(request.headers);
  if (!clientIdentity.ok) {
    return jsonError(503, "trusted_client_identity_unavailable", "This deployment could not verify the request connection. Please try again later.");
  }
  const rateLimit = checkRepairRequestRateLimit(hashClientIdentifier(clientIdentity.identifier));
  if (!rateLimit.allowed) {
    return jsonError(429, "rate_limited", "Too many requests were submitted from this connection. Please wait and try again.", {
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
  }

  const limitedBody = await readLimitedBody(request);
  if (limitedBody.kind === "too-large") {
    return jsonError(413, "request_too_large", "The request is too large. Shorten the text and try again.");
  }
  if (limitedBody.kind === "invalid-length") {
    return jsonError(400, "invalid_content_length", "The request could not be read. Please try submitting the form again.");
  }
  if (limitedBody.kind === "read-error") {
    return jsonError(400, "invalid_json", "The request could not be read. Please review the form and try again.");
  }

  let body: unknown;
  try {
    body = JSON.parse(limitedBody.raw);
  } catch {
    return jsonError(400, "invalid_json", "The request could not be read. Please review the form and try again.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError(400, "invalid_request", "Please review the form fields and try again.");
  }
  const candidate = body as Record<string, unknown>;
  if (typeof candidate.website === "string" && candidate.website.trim().length > 0) {
    return jsonError(400, "invalid_request", "Please review the form fields and try again.");
  }

  const idempotencyKey = typeof candidate.idempotencyKey === "string" ? candidate.idempotencyKey : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    return jsonError(422, "validation_failed", "Refresh the form before submitting so the request can be protected against duplicate submissions.");
  }

  const parsed = repairRequestSchema.safeParse(candidate);
  if (!parsed.success) {
    const fields = parsed.error.issues.reduce<Record<string, string[]>>((result, issue) => {
      const key = String(issue.path[0] || "form");
      (result[key] ||= []).push(issue.message);
      return result;
    }, {});
    return jsonError(422, "validation_failed", "Some fields need attention. Review the highlighted fields and try again.", { fields });
  }
  if (parsed.data.componentId && !componentIds.has(parsed.data.componentId)) {
    return jsonError(422, "validation_failed", "Choose a component from the list or select Not sure.", {
      fields: { componentId: ["Choose a component from the list or select Not sure."] },
    });
  }

  const now = new Date().toISOString();
  const record: RepairRequestRecord = {
    ...parsed.data,
    email: parsed.data.email || undefined,
    componentId: parsed.data.componentId || undefined,
    triedAlready: parsed.data.triedAlready || undefined,
    id: randomUUID(),
    idempotencyKey,
    createdAt: now,
    updatedAt: now,
    status: "new",
    notificationStatus: "pending",
    notificationAttempts: 0,
    notificationAttemptedAt: null,
    notificationLastError: null,
    notificationSuppressedAt: null,
  };
  const store = new FileRepairRequestStore(config.storageDirectory);
  try {
    // Persistence happens before any email/network call. No success is claimed if this fails.
    const createResult = await store.create(record);
    if (!createResult.created) {
      const duplicateMessage = createResult.record.notificationSuppressedAt
        ? "This form submission was already recorded. A private operator suppressed further notifications after anonymizing the record; BikeFix did not create a duplicate request."
        : createResult.record.notificationStatus === "failed"
          ? "This form submission was already recorded, but its developer notification failed. BikeFix did not create a duplicate request; the private retry process can recover the notification."
          : createResult.record.notificationStatus === "accepted"
            ? "This form submission was already recorded. The email provider accepted the notification, but delivery is not confirmed. BikeFix did not create a duplicate request."
            : "This form submission was already recorded. Its notification state is still pending or unknown. BikeFix did not create a duplicate request.";
      return NextResponse.json({
        ok: true,
        requestId: createResult.record.id,
        status: "recorded",
        notificationStatus: createResult.record.notificationStatus,
        message: duplicateMessage,
      }, { status: 200, headers: { "Cache-Control": "no-store" } });
    }
  } catch (error) {
    if (error instanceof DuplicateSubmissionInProgressError) {
      return jsonError(409, "submission_in_progress", "This request is already being processed. Wait a moment and retry this same form to check its status.");
    }
    return jsonError(503, "storage_unavailable", "BikeFix could not securely save this request, so it has not been recorded. Please try again later.");
  }

  const outcome = await notifyDeveloperOfRepairRequest(record);
  try {
    const updated = await store.updateNotification(record.id, {
      notificationStatus: outcome.status,
      notificationAttempts: record.notificationAttempts + 1,
      notificationAttemptedAt: new Date().toISOString(),
      notificationLastError: outcome.errorCode,
    });
    const message = updated.notificationStatus === "accepted"
      ? "Your request has been saved. The email provider accepted the developer notification; this does not confirm delivery."
      : "Your request has been saved, but the developer notification could not be queued. Keep your reference below; do not submit it again just because the notification failed.";
    return NextResponse.json({
      ok: true,
      requestId: record.id,
      status: "recorded",
      notificationStatus: updated.notificationStatus,
      message,
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    // The initial record remains durable with pending notification state; operations can retry it privately.
    return NextResponse.json({
      ok: true,
      requestId: record.id,
      status: "recorded",
      notificationStatus: "pending",
      message: "Your request has been saved. BikeFix could not update the notification status, so its status is unknown and may need a private retry.",
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  }
}
