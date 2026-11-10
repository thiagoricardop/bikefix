import { getSiteUrl } from "../seo/site-url";

export type SecurityHeaderEnvironment = {
  NODE_ENV?: string;
  SITE_URL?: string;
  BIKEFIX_TLS_TERMINATION_CONFIRMED?: string;
};

function hasValidHttpsSiteUrl(value: string | undefined): boolean {
  return Boolean(getSiteUrl({ SITE_URL: value }));
}

/** Static-page CSP: allows Next's build-generated inline bootstrap, but not eval or inline handlers. */
export function getStaticContentSecurityPolicy(isDevelopment = false): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${isDevelopment ? " ws: wss:" : ""}`,
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function getSecurityHeaders(env: SecurityHeaderEnvironment = process.env): Array<{ key: string; value: string }> {
  const headers = [
    { key: "Content-Security-Policy", value: getStaticContentSecurityPolicy(env.NODE_ENV === "development") },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "accelerometer=(), autoplay=(), camera=(), encrypted-media=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), usb=()" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  ];

  if (env.NODE_ENV === "production" && hasValidHttpsSiteUrl(env.SITE_URL) && env.BIKEFIX_TLS_TERMINATION_CONFIRMED === "true") {
    headers.push({ key: "Strict-Transport-Security", value: "max-age=31536000" });
  }
  return headers;
}
