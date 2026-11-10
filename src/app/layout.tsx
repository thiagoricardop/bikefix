import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getSiteUrl } from "@/lib/seo/site-url";

export const metadata: Metadata = {
  ...(getSiteUrl() ? { metadataBase: getSiteUrl() as URL } : {}),
  title: {
    default: "BikeFix — Know your bike. Fix the little things.",
    template: "%s | BikeFix",
  },
  description:
    "A clearer, more visual way to understand bicycle problems and learn the next step toward a fix.",
  applicationName: "BikeFix",
  openGraph: {
    title: "BikeFix — Know your bike. Fix the little things.",
    description:
      "Beginner-friendly bicycle care, built around visual guidance and practical explanations.",
    siteName: "BikeFix",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f7f2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
