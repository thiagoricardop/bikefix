import type { RepairRequestRecord } from "@/types/domain";

export type NotificationOutcome =
  | { status: "accepted"; errorCode: null }
  | { status: "failed"; errorCode: string };

type Environment = Record<string, string | undefined>;
type FetchLike = typeof fetch;

/** Resend REST adapter. A 2xx response means provider-accepted only, never delivered. */
export async function notifyDeveloperOfRepairRequest(
  record: RepairRequestRecord,
  env: Environment = process.env,
  fetcher: FetchLike = fetch,
): Promise<NotificationOutcome> {
  const apiKey = env.RESEND_API_KEY?.trim();
  const destination = env.REPAIR_REQUEST_NOTIFICATION_EMAIL?.trim();
  const from = env.REPAIR_REQUEST_FROM_EMAIL?.trim();
  if (!apiKey || !destination || !from) return { status: "failed", errorCode: "notification_not_configured" };

  const contactLine = record.wantsReply && record.email ? `Reply requested: yes\nContact email: ${record.email}` : "Reply requested: no";
  const body = [
    `BikeFix repair-guide request ${record.id}`,
    "",
    `Summary: ${record.summary}`,
    `Bicycle type: ${record.bicycleType}`,
    `Component: ${record.componentId || "Not specified"}`,
    `Description: ${record.description}`,
    `What they tried: ${record.triedAlready || "Not specified"}`,
    contactLine,
    "",
    "This notification contains a private guide request. Do not forward it or publish the request without authorization.",
  ].join("\n");

  try {
    const response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // Resend's 24-hour idempotency window helps prevent duplicate mail when
        // a timeout occurs after provider acceptance but before local status save.
        "Idempotency-Key": `repair-request-notification/${record.id}`,
      },
      body: JSON.stringify({ from, to: [destination], subject: `BikeFix repair-guide request ${record.id}`, text: body }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return { status: "failed", errorCode: `provider_rejected_http_${response.status}` };
    return { status: "accepted", errorCode: null };
  } catch {
    // Do not expose provider response bodies or raw exceptions in records/logs.
    return { status: "failed", errorCode: "provider_unreachable" };
  }
}
