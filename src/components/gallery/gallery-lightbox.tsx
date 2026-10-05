"use client";

import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Download from "yet-another-react-lightbox/plugins/download";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";

export interface LightboxSlide {
  src: string;
  alt: string;
  download?: string;
}

interface GalleryLightboxProps {
  open: boolean;
  index: number;
  slides: LightboxSlide[];
  onClose: () => void;
  onIndexChange: (index: number) => void;
  labels: { previous: string; next: string; close: string; zoomIn: string; zoomOut: string; download: string };
}

/**
 * Lightbox (loaded on first open). yet-another-react-lightbox provides ←/→/Esc,
 * touch swipe, a focus trap and focus return to the opener; we only restrict
 * preloading to the immediate neighbours and translate the controls.
 */
export default function GalleryLightbox({ open, index, slides, onClose, onIndexChange, labels }: GalleryLightboxProps) {
  return (
    <Lightbox
      open={open}
      close={onClose}
      index={index}
      slides={slides}
      plugins={[Zoom, Counter, Download]}
      carousel={{ preload: 1, finite: false }}
      controller={{ closeOnBackdropClick: true }}
      on={{ view: ({ index: i }) => onIndexChange(i) }}
      labels={{
        Previous: labels.previous,
        Next: labels.next,
        Close: labels.close,
        "Zoom in": labels.zoomIn,
        "Zoom out": labels.zoomOut,
        Download: labels.download,
      }}
      styles={{ container: { backgroundColor: "rgba(0,0,0,0.96)" } }}
      zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
    />
  );
}
