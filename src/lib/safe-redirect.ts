/**
 * Reduce a user-supplied post-login destination to a same-origin path.
 *
 * Checking `startsWith("/") && !startsWith("//")` is not enough: browsers
 * treat `\` as `/`, so `/\evil.com` becomes the protocol-relative `//evil.com`.
 * Resolving against a throwaway origin and requiring it to survive catches
 * that and every other host-changing trick (`/%5Cevil.com`, `/\t/evil.com`, …).
 */
export function getSafeRedirect(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.includes("\\")) return "/";

  const base = "http://same-origin.invalid";
  try {
    const url = new URL(raw, base);
    if (url.origin !== base) return "/";
    const path = `${url.pathname}${url.search}${url.hash}`;
    // Dot-segments collapse during parsing: "/.//evil.com" resolves same-origin
    // but its pathname is "//evil.com", which a browser treats as off-site.
    return path.startsWith("//") ? "/" : path;
  } catch {
    return "/";
  }
}
