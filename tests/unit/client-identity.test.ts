import { describe, expect, it } from "vitest";
import { resolveClientIdentifier } from "@/lib/repair-requests/client-identity";

describe("trusted client identity", () => {
  it("uses only the explicitly configured single IP header in production", () => {
    const headers = new Headers({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "198.51.100.5, 203.0.113.9" });
    expect(resolveClientIdentifier(headers, {
      NODE_ENV: "production",
      REPAIR_REQUEST_TRUSTED_CLIENT_IP_HEADER: "x-real-ip",
    })).toEqual({ ok: true, identifier: "203.0.113.9" });
  });

  it("rejects a missing, invalid, or comma-separated production header", () => {
    const env = { NODE_ENV: "production", REPAIR_REQUEST_TRUSTED_CLIENT_IP_HEADER: "x-real-ip" };
    expect(resolveClientIdentifier(new Headers(), env).ok).toBe(false);
    expect(resolveClientIdentifier(new Headers({ "x-real-ip": "not-an-ip" }), env).ok).toBe(false);
    expect(resolveClientIdentifier(new Headers({ "x-real-ip": "198.51.100.1, 203.0.113.1" }), env).ok).toBe(false);
  });

  it("rejects unsafe header names rather than trusting browser-controlled headers", () => {
    expect(resolveClientIdentifier(new Headers({ authorization: "Bearer fake" }), {
      NODE_ENV: "production",
      REPAIR_REQUEST_TRUSTED_CLIENT_IP_HEADER: "authorization",
    }).ok).toBe(false);
  });

  it("uses a valid development identity or a non-identifying fallback", () => {
    expect(resolveClientIdentifier(new Headers({ "x-forwarded-for": "203.0.113.2" }), { NODE_ENV: "test" })).toEqual({
      ok: true,
      identifier: "203.0.113.2",
    });
    expect(resolveClientIdentifier(new Headers(), { NODE_ENV: "test" })).toEqual({
      ok: true,
      identifier: "local-unknown-client",
    });
  });
});
