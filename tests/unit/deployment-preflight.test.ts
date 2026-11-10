import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories: string[] = [];
const script = path.resolve(process.cwd(), "scripts/deployment-preflight.mjs");

async function temporaryStorage() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "bikefix-deploy-preflight-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("production deployment preflight", () => {
  it("passes only when every synthetic host and request gate is explicitly configured", async () => {
    const storage = await temporaryStorage();
    const result = spawnSync(process.execPath, [script], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        NODE_ENV: "production",
        SITE_URL: "https://bikefix.example.com",
        BIKEFIX_DEPLOYMENT_TARGET: "self-hosted-node",
        BIKEFIX_TLS_TERMINATION_CONFIRMED: "true",
        BIKEFIX_TRUSTED_PROXY_CONFIRMED: "true",
        BIKEFIX_SINGLE_INSTANCE_CONFIRMED: "true",
        BIKEFIX_BACKUP_RESTORE_CONFIRMED: "true",
        BIKEFIX_MONITORING_CONFIRMED: "true",
        BIKEFIX_WINDOWS_STORAGE_ACL_CONFIRMED: "true",
        REPAIR_REQUEST_STORAGE_DIR: storage,
        REPAIR_REQUEST_DURABLE_STORAGE_CONFIRMED: "true",
        REPAIR_REQUEST_RETENTION_APPROVED: "true",
        REPAIR_REQUEST_RETENTION_DAYS: "90",
        REPAIR_REQUEST_RETENTION_JOB_CONFIRMED: "true",
        REPAIR_REQUEST_ACCESS_CONTROL_CONFIRMED: "true",
        REPAIR_REQUEST_AUDIT_LOG_CONFIRMED: "true",
        REPAIR_REQUEST_OPERATOR_ID: "synthetic-operator",
        REPAIR_REQUEST_TRUSTED_CLIENT_IP_HEADER: "x-real-ip",
        REPAIR_REQUEST_RATE_LIMIT_CONFIRMED: "true",
        REPAIR_REQUEST_RATE_LIMIT_SECRET: "synthetic-preflight-secret-with-more-than-32-characters",
        RESEND_API_KEY: "synthetic-secret-do-not-print",
        REPAIR_REQUEST_NOTIFICATION_EMAIL: "developer@example.com",
        REPAIR_REQUEST_FROM_EMAIL: "BikeFix <requests@example.com>",
        REPAIR_REQUEST_NOTIFICATION_PROCESSING_APPROVED: "true",
      },
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Preflight configuration checks passed");
    expect(result.stdout).not.toContain("synthetic-secret-do-not-print");
  });

  it("fails closed when deployment configuration is absent", () => {
    const result = spawnSync(process.execPath, [script], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { NODE_ENV: "development", PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT },
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("BLOCK");
    expect(result.stderr).toContain("RELEASE BLOCKED");
  });
});
