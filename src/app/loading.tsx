export default function Loading() {
  return (
    <div className="page-shell loading-page" aria-busy="true" aria-live="polite">
      <span className="loading-mark" aria-hidden="true" />
      <p>Getting your BikeFix experience ready…</p>
    </div>
  );
}
