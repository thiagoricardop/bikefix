"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Intentionally avoid logging error details in the browser UI.
    console.error("BikeFix application error", error.digest ?? "no digest");
  }, [error]);

  return (
    <main id="main-content" className="page-shell not-found-page">
      <p className="eyebrow">A TEMPORARY DETOUR</p>
      <h1>Something didn&apos;t<br /><span>go as planned.</span></h1>
      <p>Try loading this part of BikeFix again.</p>
      <button className="button button--primary" onClick={() => reset()}>Try again <span aria-hidden="true">↻</span></button>
    </main>
  );
}
