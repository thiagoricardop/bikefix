import Link from "next/link";
import { BikeFixMark } from "@/components/layout/bikefix-mark";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="page-shell footer-main">
        <div className="footer-brand-block">
          <BikeFixMark />
          <p>Clearer guidance for the ride ahead.</p>
        </div>
        <div className="footer-links">
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#bike-types">Bike types</Link>
          <Link href="/diagnose">Symptom check</Link>
          <Link href="/#repair-library">Repair library</Link>
          <Link href="/request-repair-guide">Suggest a repair</Link>
          <Link href="/privacy">Privacy</Link>
        </div>
      </div>
      <div className="page-shell footer-bottom">
        <span>© {new Date().getFullYear()} BikeFix</span>
        <span>Built for learning. Designed with safety in mind.</span>
      </div>
    </footer>
  );
}
