type BikeFixMarkProps = {
  compact?: boolean;
};

export function BikeFixMark({ compact = false }: BikeFixMarkProps) {
  return (
    <a className={`brand${compact ? " brand--compact" : ""}`} href="#top" aria-label="BikeFix home">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none">
          <circle cx="10.5" cy="27.5" r="6.4" />
          <circle cx="29.5" cy="27.5" r="6.4" />
          <path d="M10.5 27.5 17 16.5l6.3 11H10.5Zm6.5-11h6.8l6.2 11M14.4 13.2h5.3M24.6 12.2h4.6l2.4 3.5" />
        </svg>
      </span>
      {!compact && (
        <span className="brand-wordmark">
          Bike<span>Fix</span>
        </span>
      )}
    </a>
  );
}
