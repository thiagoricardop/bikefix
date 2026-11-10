import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" className="page-shell not-found-page">
      <p className="eyebrow">404 · WRONG TURN</p>
      <h1>Looks like this<br /><span>path ends here.</span></h1>
      <p>The page you&apos;re looking for isn&apos;t part of the current BikeFix release.</p>
      <Link className="button button--primary" href="/">Back to BikeFix <span aria-hidden="true">↗</span></Link>
    </main>
  );
}
