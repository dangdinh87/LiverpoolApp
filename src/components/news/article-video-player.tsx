"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Inline HLS/MP4 video player for article content.
 * Uses native <video> (Safari supports HLS natively) + dynamic HLS.js import for other browsers.
 */
export function ArticleVideoPlayer({
  src,
  poster,
  sourceUrl,
  sourceName,
}: {
  src: string;
  poster?: string;
  sourceUrl?: string;
  sourceName?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  const isHLS = /\.m3u8(\?|$)/i.test(src);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isHLS) return;

    // Prefer HLS.js when available (works in Chrome, Firefox, Edge)
    // Fall back to native HLS only on Safari where HLS.js isn't supported
    let hls: import("hls.js").default | null = null;
    import("hls.js")
      .then((mod) => {
        const Hls = mod.default;
        if (Hls.isSupported()) {
          hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60 });
          hls.loadSource(src);
          hls.attachMedia(video);
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) setError(true);
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          // Safari: native HLS support
          video.src = src;
        } else {
          setError(true);
        }
      })
      .catch(() => {
        // HLS.js failed to load — try native as last resort
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = src;
        } else {
          setError(true);
        }
      });

    return () => { hls?.destroy(); };
  }, [src, isHLS]);

  // Fallback: link to original source
  if (error) {
    return (
      <figure className="article-video-placeholder">
        <a href={sourceUrl || src} target="_blank" rel="noopener noreferrer">
          {poster && (
            <img src={poster} alt="Video thumbnail" loading="lazy" />
          )}
          <span className="video-play-overlay" />
        </a>
        <figcaption>
          Video không thể phát — nhấn để xem trên {sourceName || "nguồn gốc"}
        </figcaption>
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
        className="article-video"
        src={!isHLS ? src : undefined}
      />
    </div>
  );
}
