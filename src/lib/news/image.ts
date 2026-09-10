const BAD_IMAGE_PATTERN =
  /(avatar|blank|default-image|icon|loading|logo|pixel|placeholder|sprite|tracking|transparent)/i;
const IMAGE_META_KEYS = new Set([
  "image",
  "og:image",
  "og:image:secure_url",
  "twitter:image",
  "twitter:image:src",
  "thumbnail",
  "thumbnailurl",
]);

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCharCode(Number.parseInt(dec, 10))
    );
}

export function sanitizeImageUrl(value: unknown, baseUrl?: string): string | undefined {
  if (typeof value !== "string") return undefined;

  let raw = decodeHtmlEntities(value).trim();
  if (!raw || raw.startsWith("data:") || raw.startsWith("blob:")) return undefined;
  if (BAD_IMAGE_PATTERN.test(raw)) return undefined;

  if (raw.startsWith("//")) raw = `https:${raw}`;

  try {
    const url = baseUrl ? new URL(raw, baseUrl) : new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function getAttr(tag: string, attr: string): string | undefined {
  const match = tag.match(new RegExp(`${attr}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match?.[2] ?? match?.[3] ?? match?.[4];
}

function pickFromSrcset(srcset: string | undefined, baseUrl?: string): string | undefined {
  if (!srcset) return undefined;

  const candidates = srcset
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);

  for (let i = candidates.length - 1; i >= 0; i--) {
    const image = sanitizeImageUrl(candidates[i], baseUrl);
    if (image) return image;
  }

  return undefined;
}

function extractFromJsonLd(value: unknown, baseUrl?: string): string | undefined {
  const direct = sanitizeImageUrl(value, baseUrl);
  if (direct) return direct;

  if (Array.isArray(value)) {
    for (const item of value) {
      const image = extractFromJsonLd(item, baseUrl);
      if (image) return image;
    }
    return undefined;
  }

  if (!value || typeof value !== "object") return undefined;

  const obj = value as Record<string, unknown>;
  for (const key of ["image", "thumbnailUrl", "url", "contentUrl", "primaryImageOfPage"]) {
    const image = extractFromJsonLd(obj[key], baseUrl);
    if (image) return image;
  }

  return undefined;
}

export function extractImageUrlFromHtml(html: unknown, baseUrl?: string): string | undefined {
  if (typeof html !== "string" || !html) return undefined;
  const markup = decodeHtmlEntities(html);

  for (const match of markup.matchAll(/<(meta|link)\b[^>]*>/gi)) {
    const tag = match[0];
    const key = (
      getAttr(tag, "property") ??
      getAttr(tag, "name") ??
      getAttr(tag, "itemprop") ??
      getAttr(tag, "rel") ??
      ""
    ).toLowerCase();
    if (!IMAGE_META_KEYS.has(key)) continue;

    const image = sanitizeImageUrl(getAttr(tag, "content") ?? getAttr(tag, "href"), baseUrl);
    if (image) return image;
  }

  for (const match of markup.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )) {
    try {
      const image = extractFromJsonLd(JSON.parse(decodeHtmlEntities(match[1]).trim()), baseUrl);
      if (image) return image;
    } catch {
      // Ignore invalid publisher JSON-LD and keep trying other sources.
    }
  }

  for (const match of markup.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const image =
      sanitizeImageUrl(getAttr(tag, "data-original"), baseUrl) ??
      sanitizeImageUrl(getAttr(tag, "data-src"), baseUrl) ??
      pickFromSrcset(getAttr(tag, "data-srcset") ?? getAttr(tag, "srcset"), baseUrl) ??
      sanitizeImageUrl(getAttr(tag, "src"), baseUrl);
    if (image) return image;
  }

  return undefined;
}
