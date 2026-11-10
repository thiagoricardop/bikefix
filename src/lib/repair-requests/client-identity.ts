import { isIP } from "node:net";

const SAFE_HEADER_NAME = /^[!#$%&'*+\-.^_`|~0-9a-z]+$/i;
const FORBIDDEN_HEADER_NAMES = new Set(["authorization", "cookie", "host", "origin", "referer", "set-cookie"]);

export type ClientIdentityResult = { ok: true; identifier: string } | { ok: false };

/**
 * Production must consume exactly one IP address from a header that the trusted
 * reverse proxy strips and overwrites. Never parse an arbitrary X-Forwarded-For
 * chain in the application: its leftmost value may be attacker-controlled.
 */
export function resolveClientIdentifier(
  headers: Headers,
  env: Record<string, string | undefined> = process.env,
): ClientIdentityResult {
  if (env.NODE_ENV === "production") {
    const headerName = env.REPAIR_REQUEST_TRUSTED_CLIENT_IP_HEADER?.trim().toLowerCase();
    if (!headerName || !SAFE_HEADER_NAME.test(headerName) || FORBIDDEN_HEADER_NAMES.has(headerName)) return { ok: false };
    const value = headers.get(headerName)?.trim();
    if (!value || value.includes(",") || isIP(value) === 0) return { ok: false };
    return { ok: true, identifier: value };
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp && isIP(realIp)) return { ok: true, identifier: realIp };
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded && isIP(forwarded)) return { ok: true, identifier: forwarded };
  return { ok: true, identifier: "local-unknown-client" };
}
