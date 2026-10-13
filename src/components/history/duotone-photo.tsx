import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

/**
 * One look for photos from many sources (different kits, backgrounds, a statue,
 * a plaque): grayscale with a red multiply layer. Colour returns on hover or
 * focus of the nearest `.group` ancestor. The parent must be `relative isolate
 * overflow-hidden`: the layer multiplies against the photo and its background
 * only, not the page behind it.
 */
/** Decorative by default: the card or row around the photo already names the person. */
export function DuotonePhoto({ className, alt = "", ...props }: Omit<ImageProps, "alt"> & { alt?: string }) {
  return (
    <>
      <Image
        alt={alt}
        className={cn(
          "object-cover object-top grayscale contrast-110 brightness-90 transition-[filter] duration-300",
          "group-hover:grayscale-0 group-hover:brightness-100 group-focus-visible:grayscale-0 group-focus-visible:brightness-100",
          className,
        )}
        {...props}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-lfc-red opacity-30 mix-blend-multiply transition-opacity duration-300 group-hover:opacity-0 group-focus-visible:opacity-0"
      />
    </>
  );
}
