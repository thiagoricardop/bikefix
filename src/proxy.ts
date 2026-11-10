import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSecurityHeaders } from "./lib/security/headers";

/**
 * The request and privacy pages are dynamic so Next can attach this per-request
 * nonce to its framework scripts. Keep this matcher narrow to preserve SSG/SEO
 * and cacheability for the public educational pages.
 */
export function proxy(request: NextRequest) {
  const nonce = randomBytes(18).toString("base64");
  const development = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'none'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  for (const header of getSecurityHeaders(process.env)) {
    if (header.key.toLowerCase() !== "content-security-policy") response.headers.set(header.key, header.value);
  }
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

export const config = {
  matcher: ["/request-repair-guide", "/privacy"],
};
