"use client";

import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

interface ArticleLightboxProps {
  slides: { src: string; alt?: string }[];
  index: number;
  onClose: () => void;
}

/** Loaded on demand (see ArticleImageViewer): the lightbox is not part of the first load. */
export default function ArticleLightbox({ slides, index, onClose }: ArticleLightboxProps) {
  return (
    <Lightbox
      open
      close={onClose}
      index={index}
      slides={slides}
      plugins={[Zoom]}
      styles={{ container: { backgroundColor: "rgba(0,0,0,0.93)" } }}
      zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
    />
  );
}
