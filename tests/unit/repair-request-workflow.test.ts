import { mkdtemp, readdir, rm, stat, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { repairRequestRecordSchema, repairRequestSchema, type RepairRequestRecord } from "@/types/domain";
import { FileRepairRequestStore } from "@/lib/persistence/file-repair-request-store";
import { getRepairRequestWorkflowConfig } from "@/lib/repair-requests/config";
import { checkRepairRequestRateLimit, hashClientIdentifier, resetRepairRequestRateLimitForTests } from "@/lib/repair-requests/rate-limit";
import { notifyDeveloperOfRepairRequest } from "@/lib/notifications/repair-request-notifier";

const temporaryDirectories: string[] = [];
async function tempDirectory() {
  const value = await mkdtemp(path.join(os.tmpdir(), "bikefix-request-tests-"));
  temporaryDirectories.push(value);
  return value;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
  resetRepairRequestRateLimitForTests();
  vi.restoreAllMocks();
});

const validInput = {
  summary: "Help identify a worn chain",
  description: "I would like a beginner guide to tell when a bicycle chain may be worn and what to inspect safely.",
  bicycleType: "road" as const,
  componentId: "chain",
  triedAlready: "I checked the repair library.",
  email: "",
  wantsReply: false,
};

function record(overrides: Partial<RepairRequestRecord> = {}): RepairRequestRecord {
  const now = new Date().toISOString();
  return repairRequestRecordSchema.parse({
    ...validInput,
    id: "d9428888-122b-4f04-9d32-0a40e6b77223",
    idempotencyKey: "81d9db4a-4a72-442e-9e0b-e6b7a76fd311",
    createdAt: now,
    updatedAt: now,
    status: "new",
    notificationStatus: "pending",
    notificationAttempts: 0,
    notificationAttemptedAt: null,
    notificationLastError: null,
    notificationSuppressedAt: null,
    ...overrides,
  });
}

describe("repair request validation", () => {
  it("accepts all five bicycle types and the unsure fallback", () => {
    for (const bicycleType of ["road", "mountain", "hybrid", "gravel", "ebike", "unsure"] as const) {
      expect(repairRequestSchema.safeParse({ ...validInput, bicycleType }).success).toBe(true);
    }
  });

  it("enforces summary/description limits and reply email requirements", () => {
    expect(repairRequestSchema.safeParse({ ...validInput, summary: "tiny" }).success).toBe(false);
    expect(repairRequestSchema.safeParse({ ...validInput, description: "too short" }).success).toBe(false);
    expect(repairRequestSchema.safeParse({ ...validInput, email: "not-an-email" }).success).toBe(false);
    expect(repairRequestSchema.safeParse({ ...validInput, wantsReply: true, email: "" }).success).toBe(false);
    expect(repairRequestSchema.safeParse({ ...validInput, wantsReply: true, email: "rider@example.com" }).success).toBe(true);
  });
});

describe("private file store", () => {
  it("persists a request and updates notification metadata separately", async () => {
    const directory = await tempDirectory();
    const store = new FileRepairRequestStore(directory);
    const input = record();
    const created = await store.create(input);
    expect(created.created).toBe(true);
    expect(await store.get(input.id)).toMatchObject({ summary: input.summary, notificationStatus: "pending" });
    const updated = await store.updateNotification(input.id, {
      notificationStatus: "failed",
      notificationAttempts: 1,
      notificationAttemptedAt: new Date().toISOString(),
      notificationLastError: "notification_not_configured",
    });
    expect(updated.notificationStatus).toBe("failed");
    expect((await store.listNeedingNotification()).map((item) => item.id)).toEqual([input.id]);
    await store.create(record({
      id: "b46fcaf5-1a3b-4f45-9ac1-80c6064a9ef6",
      idempotencyKey: "ac8a9b1d-b387-4d25-984b-3ed3f2ad4614",
      notificationStatus: "failed",
      notificationSuppressedAt: new Date().toISOString(),
    }));
    expect((await store.listNeedingNotification()).map((item) => item.id)).toEqual([input.id]);
    const files = await readdir(directory);
    expect(files).toContain(`${input.id}.json`);
    expect(files.some((file) => file.endsWith(".tmp"))).toBe(false);
    if (process.platform !== "win32") expect((await stat(path.join(directory, `${input.id}.json`)).then((info) => info.mode & 0o777))).toBe(0o600);
  });

  it.skipIf(process.platform === "win32")("rejects a storage symlink into public before writing or chmodding it", async () => {
    const parent = await tempDirectory();
    const publicAlias = path.join(parent, "public-alias");
    await symlink(path.resolve(process.cwd(), "public"), publicAlias, "dir");
    const store = new FileRepairRequestStore(publicAlias);
    await expect(store.create(record())).rejects.toThrow(/resolves inside public/i);
  });

  it("returns the existing request for a repeated idempotency key instead of creating a duplicate", async () => {
    const directory = await tempDirectory();
    const store = new FileRepairRequestStore(directory);
    const original = record();
    expect((await store.create(original)).created).toBe(true);
    const duplicate = await store.create({ ...original, id: "b46fcaf5-1a3b-4f45-9ac1-80c6064a9ef6" });
    expect(duplicate.created).toBe(false);
    expect(duplicate.record.id).toBe(original.id);
    expect((await readdir(directory)).filter((file) => file.endsWith(".json"))).toHaveLength(1);
  });

  it("deletes only records older than the operator-supplied cutoff", async () => {
    const directory = await tempDirectory();
    const store = new FileRepairRequestStore(directory);
    await store.create(record({ createdAt: "2020-01-01T00:00:00.000Z", updatedAt: "2020-01-01T00:00:00.000Z" }));
    await store.create(record({ id: "b46fcaf5-1a3b-4f45-9ac1-80c6064a9ef6", idempotencyKey: "ac8a9b1d-b387-4d25-984b-3ed3f2ad4614" }));
    expect(await store.deleteOlderThan(new Date("2025-01-01T00:00:00.000Z"))).toBe(1);
    expect(await store.get("d9428888-122b-4f04-9d32-0a40e6b77223")).toBeNull();
    expect(await store.get("b46fcaf5-1a3b-4f45-9ac1-80c6064a9ef6")).not.toBeNull();
  });
});

describe("deployment gates", () => {
  it("fails closed in production without an explicit durable store, retention, rate limit and notification", () => {
    const result = getRepairRequestWorkflowConfig({ NODE_ENV: "production" }, "/srv/bikefix");
    expect(result.enabled).toBe(false);
    expect(result.mode).toBe("production-disabled");
    expect(result.disabledReason).toMatch(/SITE_URL using HTTPS/i);
  });

  it("enables a self-hosted deployment only when all operator confirmations are present", () => {
    const result = getRepairRequestWorkflowConfig({
      NODE_ENV: "production",
      SITE_URL: "https://bikefix.example.com",
      BIKEFIX_DEPLOYMENT_TARGET: "self-hosted-node",
      BIKEFIX_TLS_TERMINATION_CONFIRMED: "true",
      BIKEFIX_TRUSTED_PROXY_CONFIRMED: "true",
      BIKEFIX_SINGLE_INSTANCE_CONFIRMED: "true",
      BIKEFIX_BACKUP_RESTORE_CONFIRMED: "true",
      BIKEFIX_MONITORING_CONFIRMED: "true",
      BIKEFIX_WINDOWS_STORAGE_ACL_CONFIRMED: "true",
      REPAIR_REQUEST_TRUSTED_CLIENT_IP_HEADER: "x-real-ip",
      REPAIR_REQUEST_STORAGE_DIR: "/var/lib/bikefix/requests",
      REPAIR_REQUEST_DURABLE_STORAGE_CONFIRMED: "true",
      REPAIR_REQUEST_RATE_LIMIT_CONFIRMED: "true",
      REPAIR_REQUEST_RATE_LIMIT_SECRET: "synthetic-test-hmac-secret-at-least-32-characters",
      REPAIR_REQUEST_RETENTION_APPROVED: "true",
      REPAIR_REQUEST_RETENTION_DAYS: "90",
      REPAIR_REQUEST_RETENTION_JOB_CONFIRMED: "true",
      REPAIR_REQUEST_ACCESS_CONTROL_CONFIRMED: "true",
      REPAIR_REQUEST_AUDIT_LOG_CONFIRMED: "true",
      REPAIR_REQUEST_OPERATOR_ID: "bikefix-ops-test",
      RESEND_API_KEY: "test-key",
      REPAIR_REQUEST_NOTIFICATION_EMAIL: "developer@example.com",
      REPAIR_REQUEST_FROM_EMAIL: "BikeFix <requests@example.com>",
      REPAIR_REQUEST_NOTIFICATION_PROCESSING_APPROVED: "true",
    }, "/srv/bikefix");
    expect(result).toMatchObject({ enabled: true, mode: "self-hosted-configured", retentionDays: 90 });
  });

  it("keeps production disabled until notification-provider data processing is explicitly approved", () => {
    const environment = {
      NODE_ENV: "production",
      SITE_URL: "https://bikefix.example.com",
      BIKEFIX_DEPLOYMENT_TARGET: "self-hosted-node",
      BIKEFIX_TLS_TERMINATION_CONFIRMED: "true",
      BIKEFIX_TRUSTED_PROXY_CONFIRMED: "true",
      BIKEFIX_SINGLE_INSTANCE_CONFIRMED: "true",
      BIKEFIX_BACKUP_RESTORE_CONFIRMED: "true",
      BIKEFIX_MONITORING_CONFIRMED: "true",
      BIKEFIX_WINDOWS_STORAGE_ACL_CONFIRMED: "true",
      REPAIR_REQUEST_TRUSTED_CLIENT_IP_HEADER: "x-real-ip",
      REPAIR_REQUEST_STORAGE_DIR: "/var/lib/bikefix/requests",
      REPAIR_REQUEST_DURABLE_STORAGE_CONFIRMED: "true",
      REPAIR_REQUEST_RATE_LIMIT_CONFIRMED: "true",
      REPAIR_REQUEST_RATE_LIMIT_SECRET: "synthetic-test-hmac-secret-at-least-32-characters",
      REPAIR_REQUEST_RETENTION_APPROVED: "true",
      REPAIR_REQUEST_RETENTION_DAYS: "90",
      REPAIR_REQUEST_RETENTION_JOB_CONFIRMED: "true",
      REPAIR_REQUEST_ACCESS_CONTROL_CONFIRMED: "true",
      REPAIR_REQUEST_AUDIT_LOG_CONFIRMED: "true",
      REPAIR_REQUEST_OPERATOR_ID: "bikefix-ops-test",
      RESEND_API_KEY: "test-key",
      REPAIR_REQUEST_NOTIFICATION_EMAIL: "developer@example.com",
      REPAIR_REQUEST_FROM_EMAIL: "BikeFix <requests@example.com>",
    };
    const result = getRepairRequestWorkflowConfig(environment, "/srv/bikefix");
    expect(result.enabled).toBe(false);
    expect(result.disabledReason).toMatch(/not approved.*notification provider/i);
  });

  it("never accepts a storage directory inside the public directory", () => {
    const result = getRepairRequestWorkflowConfig({ NODE_ENV: "development", REPAIR_REQUEST_STORAGE_DIR: "/srv/bikefix/public/requests" }, "/srv/bikefix");
    expect(result.enabled).toBe(false);
  });
});

describe("rate limiting and identifier minimization", () => {
  it("allows five requests per time window and then blocks the sixth", () => {
    for (let i = 0; i < 5; i += 1) expect(checkRepairRequestRateLimit("hashed-client", 1000 + i).allowed).toBe(true);
    expect(checkRepairRequestRateLimit("hashed-client", 2000)).toMatchObject({ allowed: false });
    expect(checkRepairRequestRateLimit("other-client", 2000).allowed).toBe(true);
  });

  it("uses a keyed digest instead of storing the raw client identifier", () => {
    const digest = hashClientIdentifier("203.0.113.4", "test-secret");
    expect(digest).not.toContain("203.0.113.4");
    expect(digest).toHaveLength(64);
    expect(hashClientIdentifier("203.0.113.4", "other-secret")).not.toBe(digest);
  });
});

describe("developer notification status semantics", () => {
  it("maps a successful provider response to accepted, never delivered", async () => {
    const sourceRecord = record();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("{\"id\":\"provider-id\"}", { status: 202 }));
    const result = await notifyDeveloperOfRepairRequest(sourceRecord, {
      RESEND_API_KEY: "test-key",
      REPAIR_REQUEST_NOTIFICATION_EMAIL: "developer@example.com",
      REPAIR_REQUEST_FROM_EMAIL: "BikeFix <requests@example.com>",
    }, fetcher as typeof fetch);
    expect(result).toEqual({ status: "accepted", errorCode: null });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(new Headers(fetcher.mock.calls[0]?.[1]?.headers).get("Idempotency-Key")).toBe(`repair-request-notification/${sourceRecord.id}`);
  });

  it("returns explicit missing-configuration and provider-failure states without leaking details", async () => {
    expect(await notifyDeveloperOfRepairRequest(record(), {})).toEqual({ status: "failed", errorCode: "notification_not_configured" });
    const failed = await notifyDeveloperOfRepairRequest(record(), {
      RESEND_API_KEY: "test-key", REPAIR_REQUEST_NOTIFICATION_EMAIL: "developer@example.com", REPAIR_REQUEST_FROM_EMAIL: "BikeFix <requests@example.com>",
    }, (async () => new Response("provider error with private details", { status: 500 })) as typeof fetch);
    expect(failed).toEqual({ status: "failed", errorCode: "provider_rejected_http_500" });
  });
});
