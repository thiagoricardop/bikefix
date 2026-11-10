"use client";

import { useEffect, useRef, useState } from "react";
import type { GuideMedia } from "@/types/domain";

function RightsNote({ media }: { media: GuideMedia }) {
  const descriptions: Record<string, string> = {
    documented: "Rights documented",
    "permission-pending": "Permission pending",
    "not-provided": "Media not provided",
    "not-applicable": "Rights review not applicable",
    unknown: "Rights status unknown",
  };
  const rights = media.rightsStatus ? descriptions[media.rightsStatus] : "Rights status not recorded";

  return (
    <div className="guide-media-credit">
      <span>{media.provenance ? media.provenance.replaceAll("-", " ") : "Provenance not recorded"}</span>
      <span aria-hidden="true">·</span>
      <span>{rights}</span>
      {media.attribution && <span>Credit: {media.attribution}</span>}
      {media.licenseName && (
        <span>
          {media.licenseUrl ? <a href={media.licenseUrl} target="_blank" rel="noopener noreferrer">{media.licenseName}</a> : media.licenseName}
        </span>
      )}
      {media.sourceUrl && <a href={media.sourceUrl} target="_blank" rel="noopener noreferrer">Open media source</a>}
    </div>
  );
}

export function GuideMediaPanel({ media }: { media: GuideMedia }) {
  const [mediaUnavailable, setMediaUnavailable] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [captionsUnavailable, setCaptionsUnavailable] = useState(false);
  const trackRef = useRef<HTMLTrackElement>(null);
  const handleMediaError = () => {
    setMediaLoading(false);
    setMediaUnavailable(true);
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const handleTrackError = () => setCaptionsUnavailable(true);
    track.addEventListener("error", handleTrackError);
    return () => track.removeEventListener("error", handleTrackError);
  }, [media.captionsUrl]);

  return (
    <figure className="guide-media-panel">
      {mediaUnavailable ? (
        <div className="guide-media-fallback" role="status">
          <span className="guide-media-fallback-icon" aria-hidden="true">↗</span>
          <strong>Media unavailable</strong>
          <p>The written instructions remain available. You can continue without this media.</p>
          {media.sourceUrl && <a href={media.sourceUrl} target="_blank" rel="noopener noreferrer">Open the original media source</a>}
        </div>
      ) : media.kind === "video" ? (
        <div className="guide-video-frame">
          {mediaLoading && <div className="guide-media-loading" role="status">Loading video…</div>}
          <video
            controls
            preload="metadata"
            poster={media.poster}
            aria-label={media.alt}
            onLoadedMetadata={() => setMediaLoading(false)}
            onLoadedData={() => setMediaLoading(false)}
            onError={handleMediaError}
          >
            <source src={media.src} />
            {media.captionsUrl && <track ref={trackRef} kind="captions" src={media.captionsUrl} srcLang="en" label="English captions" />}
            Your browser does not support embedded video. The written instructions remain available below.
          </video>
          {captionsUnavailable && <p className="guide-caption-fallback" role="status">Captions could not be loaded. Check the written instructions and transcript instead.</p>}
        </div>
      ) : (
        <div className="guide-media-visual">
          {mediaLoading && <div className="guide-media-loading" role="status">Loading media…</div>}
          {/* Native img allows local or arbitrary documented sources and a reliable onError fallback. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={`guide-media-image guide-media-image--${media.kind}`}
            src={media.src}
            alt={media.alt}
            loading="lazy"
            onLoad={() => setMediaLoading(false)}
            onError={handleMediaError}
          />
        </div>
      )}
      {media.caption && <figcaption>{media.caption}</figcaption>}
      {media.transcript && (
        <details className="guide-transcript">
          <summary>Read media transcript / text alternative</summary>
          <p>{media.transcript}</p>
        </details>
      )}
      <RightsNote media={media} />
    </figure>
  );
}
