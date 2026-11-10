import { realpathSync } from "node:fs";
import path from "node:path";
import { getSiteUrl } from "@/lib/seo/site-url";

export type RepairRequestWorkflowConfig = {
  enabled: boolean;
  storageDirectory: string;
  retentionDays: number | null;
  mode: "local-development" | "production-disabled" | "self-hosted-configured";
  disabledReason: string | null;
};

type Environment = Record<string, string | undefined>;

function positiveInteger(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 3650 ? parsed : null;
}

function isInside(childPath: string, parentPath: string): boolean {
  const relative = path.relative(parentPath, childPath);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function canonicalProspectivePath(target: string): string | null {
  let current = path.resolve(target);
  const suffix: string[] = [];
  while (true) {
    try {
      return path.resolve(realpathSync(current), ...suffix);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") return null;
      const parent = path.dirname(current);
      if (parent === current) return null;
      suffix.unshift(path.basename(current));
      current = parent;
    }
  }
}

function isPrivateStoragePath(storagePath: string, publicPath: string): boolean {
  const canonicalStorage = canonicalProspectivePath(storagePath);
  const canonicalPublic = canonicalProspectivePath(publicPath);
  return Boolean(canonicalStorage && canonicalPublic) && !isInside(canonicalStorage as string, canonicalPublic as string);
}

function isOutsideApplicationPath(storagePath: string, applicationPath: string): boolean {
  const canonicalStorage = canonicalProspectivePath(storagePath);
  const canonicalApplication = canonicalProspectivePath(applicationPath);
  return Boolean(canonicalStorage && canonicalApplication) && !isInside(canonicalStorage as string, canonicalApplication as string);
}

/**
 * Production is fail-closed until the operator has explicitly confirmed all
 * hosting, privacy, durable-storage, rate-limit, notification and retention gates.
 * Environment flags are operator attestations, not a substitute for deployment review.
 */
export function getRepairRequestWorkflowConfig(env: Environment = process.env, cwd = process.cwd()): RepairRequestWorkflowConfig {
  const isProduction = env.NODE_ENV === "production";
  const configuredDirectory = env.REPAIR_REQUEST_STORAGE_DIR?.trim();
  const storageDirectory = configuredDirectory
    ? path.resolve(cwd, configuredDirectory)
    : path.join(cwd, ".data", "repair-requests");
  const publicDirectory = path.join(cwd, "public");
  const directorySafe = isPrivateStoragePath(storageDirectory, publicDirectory);
  const storageOutsideApplication = isOutsideApplicationPath(storageDirectory, cwd);
  const retentionDays = positiveInteger(env.REPAIR_REQUEST_RETENTION_DAYS);
  const retentionApproved = env.REPAIR_REQUEST_RETENTION_APPROVED === "true";
  const cleanupConfirmed = env.REPAIR_REQUEST_RETENTION_JOB_CONFIRMED === "true";
  const durableStorageConfirmed = env.REPAIR_REQUEST_DURABLE_STORAGE_CONFIRMED === "true";
  const rateLimitSecretLength = env.REPAIR_REQUEST_RATE_LIMIT_SECRET?.trim().length ?? 0;
  const rateLimitConfirmed = env.REPAIR_REQUEST_RATE_LIMIT_CONFIRMED === "true" && rateLimitSecretLength >= 32;
  const accessControlConfirmed = env.REPAIR_REQUEST_ACCESS_CONTROL_CONFIRMED === "true";
  const auditLogConfirmed = env.REPAIR_REQUEST_AUDIT_LOG_CONFIRMED === "true";
  const operatorIdentityConfigured = Boolean(env.REPAIR_REQUEST_OPERATOR_ID?.trim());
  const notificationConfigured = Boolean(
    env.RESEND_API_KEY?.trim() && env.REPAIR_REQUEST_NOTIFICATION_EMAIL?.trim() && env.REPAIR_REQUEST_FROM_EMAIL?.trim(),
  );
  const notificationDataProcessingApproved = env.REPAIR_REQUEST_NOTIFICATION_PROCESSING_APPROVED === "true";
  const absoluteDirectoryProvided = Boolean(configuredDirectory && path.isAbsolute(configuredDirectory));
  const tlsTerminationConfirmed = env.BIKEFIX_TLS_TERMINATION_CONFIRMED === "true";
  const deploymentTargetConfirmed = env.BIKEFIX_DEPLOYMENT_TARGET === "self-hosted-node";
  const singleInstanceConfirmed = env.BIKEFIX_SINGLE_INSTANCE_CONFIRMED === "true";
  const backupRestoreConfirmed = env.BIKEFIX_BACKUP_RESTORE_CONFIRMED === "true";
  const monitoringConfirmed = env.BIKEFIX_MONITORING_CONFIRMED === "true";
  const trustedProxyConfirmed = env.BIKEFIX_TRUSTED_PROXY_CONFIRMED === "true";
  const trustedClientIpHeader = env.REPAIR_REQUEST_TRUSTED_CLIENT_IP_HEADER?.trim().toLowerCase() ?? "";
  const trustedClientIpHeaderValid = /^[!#$%&'*+\-.^_`|~0-9a-z]+$/i.test(trustedClientIpHeader)
    && !["authorization", "cookie", "host", "origin", "referer", "set-cookie"].includes(trustedClientIpHeader);
  const siteUrlValid = Boolean(getSiteUrl(env));

  if (!isProduction) {
    return {
      enabled: directorySafe,
      storageDirectory,
      retentionDays,
      mode: "local-development",
      disabledReason: directorySafe ? null : "Request storage must not be located in the public directory.",
    };
  }

  const productionChecks: Array<[boolean, string]> = [
    [siteUrlValid, "A verified public SITE_URL using HTTPS must be configured."],
    [tlsTerminationConfirmed, "HTTPS/TLS termination has not been verified for this deployment."],
    [deploymentTargetConfirmed, "The supported self-hosted Node deployment target has not been selected."],
    [singleInstanceConfirmed, "The single-instance Node deployment model has not been verified for file-backed storage and in-process limits."],
    [backupRestoreConfirmed, "A backup and restore test has not been completed for this storage volume."],
    [monitoringConfirmed, "Production monitoring and alerting have not been verified."],
    [absoluteDirectoryProvided && directorySafe && storageOutsideApplication, "An absolute private storage directory outside the application and public/ directories must be configured."],
    [process.platform !== "win32" || env.BIKEFIX_WINDOWS_STORAGE_ACL_CONFIRMED === "true", "Windows filesystem ACLs for the private request volume have not been verified."],
    [durableStorageConfirmed, "Durable persistent storage has not been confirmed for this host."],
    [retentionApproved && retentionDays !== null, "An owner-approved retention policy and valid retention period are required."],
    [cleanupConfirmed, "A verified retention cleanup schedule is required."],
    [trustedProxyConfirmed && trustedClientIpHeaderValid, "A trusted reverse-proxy client-IP header has not been configured and verified."],
    [rateLimitConfirmed, "Trusted production edge/proxy rate limiting and a 32-character-minimum random HMAC secret have not been confirmed."],
    [accessControlConfirmed && operatorIdentityConfigured, "Authorized operator access and operator identity have not been confirmed."],
    [auditLogConfirmed, "Private operator-action audit logging has not been confirmed."],
    [notificationConfigured, "The developer notification provider and destination are not configured."],
    [notificationDataProcessingApproved, "The owner has not approved sending request details to the notification provider and mailbox."],
  ];
  const failedCheck = productionChecks.find(([passed]) => !passed);
  if (failedCheck) {
    return {
      enabled: false,
      storageDirectory,
      retentionDays,
      mode: "production-disabled",
      disabledReason: failedCheck[1],
    };
  }

  return {
    enabled: true,
    storageDirectory,
    retentionDays,
    mode: "self-hosted-configured",
    disabledReason: null,
  };
}
