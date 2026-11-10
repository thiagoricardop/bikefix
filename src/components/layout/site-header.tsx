import Link from "next/link";
import { BikeFixMark } from "@/components/layout/bikefix-mark";

const navItems = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Bike types", href: "/#bike-types" },
  { label: "Symptom check", href: "/diagnose" },
  { label: "Repair library", href: "/guides" },
];

export function SiteHeader() {
  return (
    <header className="site-header" id="top">
      <div className="header-inner page-shell">
        <BikeFixMark />
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <Link className="button button--dark header-cta" href="/request-repair-guide">
          Suggest a repair <span aria-hidden="true">↗</span>
        </Link>
        <details className="mobile-nav">
          <summary aria-label="Open navigation menu">
            <span className="menu-lines" aria-hidden="true"><i /><i /></span>
          </summary>
          <nav aria-label="Mobile navigation">
            {navItems.map((item) => (
              <Link href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
            <Link href="/request-repair-guide">Suggest a repair</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
