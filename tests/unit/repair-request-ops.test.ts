import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories: string[] = [];
async function tempDirectory() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "bikefix-ops-test-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

function exampleRecord(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  return {
    id: "d9428888-122b-4f04-9d32-0a40e6b77223",
    idempotencyKey: "81d9db4a-4a72-442e-9e0b-e6b7a76fd311",
    summary: "Help identify a worn chain",
    description: "I want a beginner guide to know when a bicycle chain might be worn and what to inspect safely.",
    bicycleType: "road",
    componentId: "chain",
    triedAlready: "I looked at the existing library.",
    email: "rider@example.com",
    wantsReply: true,
    createdAt: now,
    updatedAt: now,
    status: "new",
    notificationStatus: "failed",
    notificationAttempts: 1,
    notificationAttemptedAt: now,
    notificationLastError: "notification_not_configured",
    ...overrides,
  };
}

function runOps(directory: string, args: string[]) {
  const script = path.resolve(process.cwd(), "scripts/repair-request-ops.mjs");
  return spawnSync(process.execPath, [script, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "test", REPAIR_REQUEST_STORAGE_DIR: directory, REPAIR_REQUEST_OPERATOR_ID: "unit-test-operator" },
  });
}

describe("private repair-request operations CLI", () => {
  it("lists minimal metadata, audits private reads, and supports controlled anonymization/deletion", async () => {
    const directory = await tempDirectory();
    const record = exampleRecord();
    await writeFile(path.join(directory, `${record.id}.json`), `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 });

    const list = runOps(directory, ["list"]);
    expect(list.status).toBe(0);
    expect(list.stdout).toContain(record.id);
    expect(list.stdout).not.toContain(record.description);

    const show = runOps(directory, ["show", record.id]);
    expect(show.status).toBe(0);
    expect(show.stdout).toContain(record.description);
    const auditPath = path.join(directory, "operations-audit.jsonl");
    const auditBefore = await readFile(auditPath, "utf8");
    expect(auditBefore).toContain('"action":"show"');
    expect(auditBefore).not.toContain(record.description);

    const anonymize = runOps(directory, ["anonymize", record.id, "--confirm"]);
    expect(anonymize.status).toBe(0);
    const updated = JSON.parse(await readFile(path.join(directory, `${record.id}.json`), "utf8"));
    expect(updated).toMatchObject({
      summary: "Anonymized request",
      email: "",
      wantsReply: false,
      notificationSuppressedAt: expect.any(String),
    });
    expect(updated.description).not.toContain(record.description);
    expect((await readFile(auditPath, "utf8"))).toContain('"action":"anonymize"');

    const deletionWithoutConfirmation = runOps(directory, ["delete", record.id]);
    expect(deletionWithoutConfirmation.status).not.toBe(0);
    expect(await readdir(directory)).toContain(`${record.id}.json`);
    const deletion = runOps(directory, ["delete", record.id, "--confirm"]);
    expect(deletion.status).toBe(0);
    expect(await readdir(directory)).not.toContain(`${record.id}.json`);
    expect(await readFile(auditPath, "utf8")).toContain('"action":"delete"');
  });

  it("requires explicit policy approval for retention and defaults to a dry run", async () => {
    const directory = await tempDirectory();
    const oldDate = "2020-01-01T00:00:00.000Z";
    const record = exampleRecord({ createdAt: oldDate, updatedAt: oldDate });
    await writeFile(path.join(directory, `${record.id}.json`), `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 });
    const script = path.resolve(process.cwd(), "scripts/repair-request-ops.mjs");
    const baseEnv: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "test", REPAIR_REQUEST_STORAGE_DIR: directory, REPAIR_REQUEST_OPERATOR_ID: "unit-test-operator", REPAIR_REQUEST_RETENTION_DAYS: "90", REPAIR_REQUEST_RETENTION_JOB_CONFIRMED: "true" };

    const unapproved = spawnSync(process.execPath, [script, "expire"], { cwd: process.cwd(), encoding: "utf8", env: { ...baseEnv, REPAIR_REQUEST_RETENTION_APPROVED: "false" } });
    expect(unapproved.status).not.toBe(0);
    expect(await readdir(directory)).toContain(`${record.id}.json`);

    const dryRun = spawnSync(process.execPath, [script, "expire"], { cwd: process.cwd(), encoding: "utf8", env: { ...baseEnv, REPAIR_REQUEST_RETENTION_APPROVED: "true" } });
    expect(dryRun.status).toBe(0);
    expect(dryRun.stdout).toMatch(/Dry run: 1 request record/i);
    expect(await readdir(directory)).toContain(`${record.id}.json`);

    const applied = spawnSync(process.execPath, [script, "expire", "--apply"], { cwd: process.cwd(), encoding: "utf8", env: { ...baseEnv, REPAIR_REQUEST_RETENTION_APPROVED: "true" } });
    expect(applied.status).toBe(0);
    expect(await readdir(directory)).not.toContain(`${record.id}.json`);
    expect(await readFile(path.join(directory, "operations-audit.jsonl"), "utf8")).toContain('"action":"retention-delete"');
  });
});
