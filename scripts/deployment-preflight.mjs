import { isIP } from "node:net";
import { access, realpath, stat } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";

const checks = [];
const add = (name, passed, detail) => checks.push({ name, passed: Boolean(passed), detail });
const yes = (name) => process.env[name] === "true";
const value = (name) => process.env[name]?.trim() ?? "";

const [major, minor] = process.versions.node.split(".").map(Number);
add("Node.js >= 22.12", major > 22 || (major === 22 && minor >= 12), `Detected Node.js ${process.versions.node}`);
add("Production environment", process.env.NODE_ENV === "production", "Set NODE_ENV=production for the release preflight.");
add("Self-hosted single Node target", value("BIKEFIX_DEPLOYMENT_TARGET") === "self-hosted-node", "The file-backed request adapter supports one persistent Node instance only.");

let siteUrl;
try {
  siteUrl = new URL(value("SITE_URL"));
} catch {
  siteUrl = null;
}
const siteHostname = siteUrl?.hostname.replace(/^\[|\]$/g, "") ?? "";
const siteUrlValid = Boolean(siteUrl && siteUrl.protocol === "https:" && !siteUrl.username && !siteUrl.password && !siteUrl.search && !siteUrl.hash && siteUrl.pathname === "/" && siteHostname !== "localhost" && !siteHostname.endsWith(".localhost") && isIP(siteHostname) === 0);
add("Canonical HTTPS SITE_URL", siteUrlValid, "Use the exact public HTTPS origin with no path, credentials, query, or fragment.");
add("TLS termination verified", yes("BIKEFIX_TLS_TERMINATION_CONFIRMED"), "Verify HTTPS at the public edge and HTTP-to-HTTPS redirect behavior.");
add("Trusted reverse proxy verified", yes("BIKEFIX_TRUSTED_PROXY_CONFIRMED"), "The proxy must strip and overwrite the configured client-IP header from the actual connection peer.");
add("Single-instance deployment verified", yes("BIKEFIX_SINGLE_INSTANCE_CONFIRMED"), "Do not use multiple app instances with the file store and in-process rate limiter.");
add("Persistent storage attested", yes("REPAIR_REQUEST_DURABLE_STORAGE_CONFIRMED"), "Restart and redeploy persistence must be tested on the actual volume.");
add("Backup and restore verified", yes("BIKEFIX_BACKUP_RESTORE_CONFIRMED"), "Perform and document a restore test, including encrypted backup access controls.");
add("Monitoring and alerting verified", yes("BIKEFIX_MONITORING_CONFIRMED"), "Configure process, disk, backup, request-storage and notification-failure alerts.");

const storageValue = value("REPAIR_REQUEST_STORAGE_DIR");
let storageReady = false;
let storageDetail = "Set an absolute private directory outside both the application and public directories.";
if (storageValue && path.isAbsolute(storageValue)) {
  try {
    const storage = await realpath(storageValue);
    const publicDirectory = await realpath(path.resolve("public"));
    const applicationDirectory = await realpath(path.resolve("."));
    const relative = path.relative(publicDirectory, storage);
    const insidePublic = relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
    const outsidePublic = !insidePublic;
    const appRelative = path.relative(applicationDirectory, storage);
    const insideApplication = appRelative === "" || (!appRelative.startsWith(`..${path.sep}`) && appRelative !== ".." && !path.isAbsolute(appRelative));
    const info = await stat(storage);
    await access(storage, constants.R_OK | constants.W_OK | constants.X_OK);
    const privatePosixMode = process.platform === "win32" || (info.mode & 0o077) === 0;
    storageReady = outsidePublic && !insideApplication && info.isDirectory() && privatePosixMode;
    storageDetail = process.platform === "win32"
      ? "Directory must exist outside the app/public directories; verify Windows ACLs manually and record the result."
      : "Directory must exist outside the app/public directories, be accessible, and grant no group/other permissions.";
  } catch {
    storageDetail = "Directory must already exist, be accessible, and resolve outside both the application and public directories.";
  }
}
add("Private request storage directory", storageReady, storageDetail);
if (process.platform === "win32") {
  add("Windows storage ACL review", yes("BIKEFIX_WINDOWS_STORAGE_ACL_CONFIRMED"), "Confirm only the service account and authorized operators can read the volume, then set the attestation.");
}
add("Owner-approved retention policy", yes("REPAIR_REQUEST_RETENTION_APPROVED") && /^\d+$/.test(value("REPAIR_REQUEST_RETENTION_DAYS")) && Number(value("REPAIR_REQUEST_RETENTION_DAYS")) >= 1 && Number(value("REPAIR_REQUEST_RETENTION_DAYS")) <= 3650, "Approve the actual period and treatment of unresolved records; valid range is 1–3650 days.");
add("Scheduled cleanup tested", yes("REPAIR_REQUEST_RETENTION_JOB_CONFIRMED"), "Verify the scheduler and an observed dry-run/apply procedure.");
add("Operator access controls", yes("REPAIR_REQUEST_ACCESS_CONTROL_CONFIRMED") && Boolean(value("REPAIR_REQUEST_OPERATOR_ID")), "Verify named authorized operator accounts and least-privilege volume access.");
add("Private audit log controls", yes("REPAIR_REQUEST_AUDIT_LOG_CONFIRMED"), "Verify audit-log protection, backup and review procedure.");
const header = value("REPAIR_REQUEST_TRUSTED_CLIENT_IP_HEADER");
add("Trusted client-IP header", /^[!#$%&'*+\-.^_`|~0-9a-z]+$/i.test(header) && !["authorization", "cookie", "host", "origin", "referer", "set-cookie"].includes(header.toLowerCase()), "Configure one header that the trusted reverse proxy strips and overwrites with exactly one validated IP address.");
add("Rate-limit secret and edge limit", yes("REPAIR_REQUEST_RATE_LIMIT_CONFIRMED") && value("REPAIR_REQUEST_RATE_LIMIT_SECRET").length >= 32, "Configure trusted edge throttling and a random HMAC secret of at least 32 characters.");
add("Notification provider configured", Boolean(value("RESEND_API_KEY") && value("REPAIR_REQUEST_NOTIFICATION_EMAIL") && value("REPAIR_REQUEST_FROM_EMAIL")), "Configure server-side Resend credentials and verified sender/destination addresses.");
add("Notification processing approved", yes("REPAIR_REQUEST_NOTIFICATION_PROCESSING_APPROVED"), "Owner must approve sharing request details with Resend and the destination mailbox.");

let failed = 0;
console.log("\nBikeFix production preflight (does not deploy or prove provider/host controls)\n");
for (const check of checks) {
  const marker = check.passed ? "PASS" : "BLOCK";
  console.log(`${marker.padEnd(6)} ${check.name}\n       ${check.detail}`);
  if (!check.passed) failed += 1;
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed.`);
if (failed) {
  console.error("\nRELEASE BLOCKED: resolve every blocker and verify it in the actual target environment. Do not enable public request submissions.\n");
  process.exitCode = 1;
} else {
  console.log("\nPreflight configuration checks passed. This is not a deployment, penetration test, legal review, or independent proof of infrastructure controls.\n");
}
