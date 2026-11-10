import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/repair-requests/route";
import { resetRepairRequestRateLimitForTests } from "@/lib/repair-requests/rate-limit";

let directory = "";
let oldStorage: string | undefined;
let counter = 0;
const basePayload = {
  summary: "Guide to identifying a worn chain",
  description: "I want a beginner-friendly way to recognize chain wear and decide what to inspect next.",
  bicycleType: "road",
  componentId: "chain",
  triedAlready: "I looked through the repair library.",
  email: "",
  wantsReply: false,
};

function newKey() {
  counter += 1;
  return `b47e3a7${counter}-a391-4b29-8c73-000000000001`;
}
function makeRequest(payload: Record<string, unknown>, ip = `198.51.100.${(counter % 200) + 1}`, origin = "http://localhost:3000") {
  return new NextRequest("http://localhost:3000/api/repair-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin, "X-Forwarded-For": ip },
    body: JSON.stringify({ ...payload, idempotencyKey: payload.idempotencyKey ?? newKey() }),
  });
}

beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "bikefix-api-test-"));
  oldStorage = process.env.REPAIR_REQUEST_STORAGE_DIR;
  process.env.REPAIR_REQUEST_STORAGE_DIR = directory;
  delete process.env.RESEND_API_KEY;
  delete process.env.REPAIR_REQUEST_NOTIFICATION_EMAIL;
  delete process.env.REPAIR_REQUEST_FROM_EMAIL;
  resetRepairRequestRateLimitForTests();
  counter = 0;
});

afterEach(async () => {
  if (oldStorage === undefined) delete process.env.REPAIR_REQUEST_STORAGE_DIR;
  else process.env.REPAIR_REQUEST_STORAGE_DIR = oldStorage;
  await rm(directory, { recursive: true, force: true });
  resetRepairRequestRateLimitForTests();
});

describe("POST /api/repair-requests", () => {
  it("persists before responding and accurately reports a notification failure", async () => {
    const response = await POST(makeRequest(basePayload));
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body).toMatchObject({ ok: true, status: "recorded", notificationStatus: "failed" });
    expect(body.message).toMatch(/saved, but the developer notification could not be queued/i);
    const files = (await readdir(directory)).filter((name) => name.endsWith(".json"));
    expect(files).toHaveLength(1);
    const stored = JSON.parse(await readFile(path.join(directory, files[0]), "utf8"));
    expect(stored.id).toBe(body.requestId);
    expect(stored.notificationStatus).toBe("failed");
    expect(stored.notificationLastError).toBe("notification_not_configured");
    expect(stored.description).toBe(basePayload.description);
  });

  it("rejects invalid fields and unsupported components without persisting", async () => {
    const short = await POST(makeRequest({ ...basePayload, summary: "bad" }, "198.51.100.41"));
    expect(short.status).toBe(422);
    const component = await POST(makeRequest({ ...basePayload, componentId: "not-a-component" }, "198.51.100.42"));
    expect(component.status).toBe(422);
    expect((await readdir(directory)).filter((name) => name.endsWith(".json"))).toHaveLength(0);
  });

  it("caps streamed request bodies even when Content-Length is absent", async () => {
    const body = JSON.stringify({ ...basePayload, idempotencyKey: newKey(), description: "x".repeat(17_000) });
    const response = await POST(new NextRequest("http://localhost:3000/api/repair-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", "X-Forwarded-For": "198.51.100.43" },
      body,
    }));
    expect(response.status).toBe(413);
    expect((await response.json()).code).toBe("request_too_large");
    expect((await readdir(directory)).filter((name) => name.endsWith(".json"))).toHaveLength(0);
  });

  it("rejects cross-origin and honeypot submissions", async () => {
    expect((await POST(makeRequest(basePayload, "198.51.100.50", "https://attacker.example"))).status).toBe(403);
    expect((await POST(makeRequest({ ...basePayload, website: "spam" }, "198.51.100.51"))).status).toBe(400);
    expect((await readdir(directory)).filter((name) => name.endsWith(".json"))).toHaveLength(0);
  });

  it("uses the same idempotency key to prevent duplicate records and notification attempts", async () => {
    const idempotencyKey = newKey();
    const first = await POST(makeRequest({ ...basePayload, idempotencyKey }, "198.51.100.60"));
    const firstBody = await first.json();
    const second = await POST(makeRequest({ ...basePayload, idempotencyKey, summary: "Different summary after network retry" }, "198.51.100.60"));
    const secondBody = await second.json();
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(secondBody.requestId).toBe(firstBody.requestId);
    expect(secondBody.message).toMatch(/already recorded/i);
    expect((await readdir(directory)).filter((name) => name.endsWith(".json"))).toHaveLength(1);
  });

  it("does not falsely confirm a request when private storage fails", async () => {
    const targetFile = path.join(directory, "not-a-directory");
    await writeFile(targetFile, "block directory creation");
    process.env.REPAIR_REQUEST_STORAGE_DIR = path.join(targetFile, "children");
    const response = await POST(makeRequest(basePayload, "198.51.100.70"));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toMatchObject({ ok: false, code: "storage_unavailable" });
    expect(body.message).toMatch(/has not been recorded/i);
  });

  it("rate-limits repeated requests from the same client identifier", async () => {
    for (let index = 0; index < 5; index += 1) {
      const response = await POST(makeRequest({ ...basePayload, idempotencyKey: newKey() }, "198.51.100.80"));
      expect(response.status).toBe(201);
    }
    const blocked = await POST(makeRequest({ ...basePayload, idempotencyKey: newKey() }, "198.51.100.80"));
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).code).toBe("rate_limited");
  });
});
