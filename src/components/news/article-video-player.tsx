"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Inline HLS/MP4 video player for article content.
 * Uses native <video> HLS on Safari (zero extra JS) + dynamic HLS.js import for other browsers,
 * with strict unmount cancellation so Hls instances never leak.
 */
export function ArticleVideoPlayer({
  src,
  poster,
  sourceUrl,
  sourceName,
  fallbackLabel,
}: {
  src: string;
  poster?: string;
  sourceUrl?: string;
  sourceName?: string;
  fallbackLabel: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  const isHLS = /\.m3u8(\?|$)/i.test(src);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isHLS) return;

    let cancelled = false;
    let hls: import("hls.js").default | null = null;

    // Safari / iOS support HLS natively without downloading ~178 KB gzip of hls.js.
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return () => {
        cancelled = true;
      };
    }

    import("hls.js")
      .then((mod) => {
        if (cancelled) return;
        const Hls = mod.default;
        if (Hls.isSupported()) {
          hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60 });
          hls.loadSource(src);
          hls.attachMedia(video);
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (!cancelled && data.fatal) setError(true);
          });
        } else {
          setError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [src, isHLS]);

  if (error) {
    const captionText = sourceName ? `${fallbackLabel} (${sourceName})` : fallbackLabel;
    return (
      <figure className="article-video-placeholder">
        <a
          href={sourceUrl || src}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={captionText}
        >
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt="" loading="lazy" referrerPolicy="no-referrer" />
          )}
          <span className="video-play-overlay" aria-hidden />
        </a>
        <figcaption>{captionText}</figcaption>
      </figure>
    );
  }

  return (
    <div className="article-video-container">
      <video
        ref={videoRef}
        controls
        playsInline
        preload="metadata"
        poster={poster}
        aria-label={sourceName || fallbackLabel}
        className="article-video"
        src={!isHLS ? src : undefined}
        onError={() => setError(true)}
      />
    </div>
  );
}
