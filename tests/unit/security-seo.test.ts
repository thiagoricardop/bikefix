import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { buildRobots } from "@/app/robots";
import { buildSitemap } from "@/app/sitemap";
import { getSecurityHeaders, getStaticContentSecurityPolicy } from "@/lib/security/headers";
import { getCanonicalUrl, getSiteUrl } from "@/lib/seo/site-url";

describe("security headers", () => {
  it("sets defensive static CSP without unsafe-eval in production", () => {
    const csp = getStaticContentSecurityPolicy(false);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src-attr 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain("unsafe-eval");
  });

  it("adds HSTS only for a configured HTTPS production origin", () => {
    expect(getSecurityHeaders({ NODE_ENV: "production", SITE_URL: "https://bikefix.example.com" }).some((h) => h.key === "Strict-Transport-Security")).toBe(false);
    expect(getSecurityHeaders({ NODE_ENV: "production", SITE_URL: "https://bikefix.example.com", BIKEFIX_TLS_TERMINATION_CONFIRMED: "true" }).some((h) => h.key === "Strict-Transport-Security")).toBe(true);
    expect(getSecurityHeaders({ NODE_ENV: "production", SITE_URL: "http://localhost:3000", BIKEFIX_TLS_TERMINATION_CONFIRMED: "true" }).some((h) => h.key === "Strict-Transport-Security")).toBe(false);
    expect(getSecurityHeaders({ NODE_ENV: "development", SITE_URL: "https://bikefix.example.com", BIKEFIX_TLS_TERMINATION_CONFIRMED: "true" }).some((h) => h.key === "Strict-Transport-Security")).toBe(false);
  });
});

describe("canonical SEO configuration", () => {
  it("accepts a root HTTPS origin and safely generates root or project-site URLs", () => {
    expect(getSiteUrl({ SITE_URL: "https://bikefix.example.com" })?.origin).toBe("https://bikefix.example.com");
    expect(getSiteUrl({ SITE_URL: "http://bikefix.example.com" })).toBeNull();
    expect(getSiteUrl({ SITE_URL: "https://bikefix.example.com/path" })).toBeNull();
    expect(getCanonicalUrl("/guides", { SITE_URL: "https://bikefix.example.com" })).toBe("https://bikefix.example.com/guides");
    expect(getCanonicalUrl("/guides", { SITE_URL: "https://owner.github.io", NEXT_PUBLIC_BASE_PATH: "/bikefix" })).toBe("https://owner.github.io/bikefix/guides");
    expect(getCanonicalUrl("//evil.example/path", { SITE_URL: "https://bikefix.example.com" })).toBeUndefined();
    expect(getCanonicalUrl("/guides", { SITE_URL: "https://owner.github.io", NEXT_PUBLIC_BASE_PATH: "//evil.example" })).toBeUndefined();
  });

  it("fails robots closed without a canonical URL and excludes APIs when configured", () => {
    expect(buildRobots({}).rules).toMatchObject({ userAgent: "*", disallow: "/" });
    expect(buildRobots({ SITE_URL: "https://bikefix.example.com" })).toMatchObject({
      rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
      sitemap: "https://bikefix.example.com/sitemap.xml",
    });
    expect(buildRobots({ SITE_URL: "https://owner.github.io", NEXT_PUBLIC_BASE_PATH: "/bikefix" }).sitemap).toBe("https://owner.github.io/bikefix/sitemap.xml");
  });

  it("includes only the homepage, privacy notice and actually published guides", () => {
    const urls = buildSitemap({ SITE_URL: "https://bikefix.example.com" }).map((entry) => entry.url);
    expect(urls).toContain("https://bikefix.example.com/");
    expect(urls).toContain("https://bikefix.example.com/privacy");
    expect(urls.some((url) => url.includes("/request-repair-guide"))).toBe(false);
    expect(urls.some((url) => url.includes("/diagnose"))).toBe(false);
    expect(urls.some((url) => url.includes("/content-inventory"))).toBe(false);
    expect(urls.some((url) => url.includes("/guides/"))).toBe(false);
    expect(buildSitemap({}).length).toBe(0);
    expect(buildSitemap({ SITE_URL: "https://owner.github.io", NEXT_PUBLIC_BASE_PATH: "/bikefix" }).map((entry) => entry.url)).toContain("https://owner.github.io/bikefix/");
  });
});


describe("nonce CSP proxy", () => {
  it("issues a fresh nonce and no-store response for each sensitive page request", () => {
    const first = proxy(new NextRequest("https://bikefix.example.com/request-repair-guide"));
    const second = proxy(new NextRequest("https://bikefix.example.com/privacy"));
    const firstCsp = first.headers.get("Content-Security-Policy") ?? "";
    const secondCsp = second.headers.get("Content-Security-Policy") ?? "";
    const firstNonce = firstCsp.match(/'nonce-([^']+)'/)?.[1];
    const secondNonce = secondCsp.match(/'nonce-([^']+)'/)?.[1];

    expect(firstNonce).toBeTruthy();
    expect(secondNonce).toBeTruthy();
    expect(firstNonce).not.toBe(secondNonce);
    expect(firstCsp).not.toContain("'unsafe-inline'");
    expect(first.headers.get("Cache-Control")).toContain("no-store");
  });
});
