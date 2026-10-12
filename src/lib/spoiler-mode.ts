/**
 * Spoiler-free mode: for fans who watch the replay hours later (a 2am kick-off
 * in Asia), scores and results stay hidden across the site until they choose to
 * see them.
 *
 * It is a per-viewer preference kept in localStorage and applied as an
 * attribute on <html>. Pages are cached for everyone, so hiding happens in CSS
 * (globals.css, `.spoiler-hide` / `.spoiler-show`) rather than in the render;
 * SPOILER_BOOT_SCRIPT sets the attribute before the first paint, so a score
 * never flashes up while the page loads.
 */

export const SPOILER_STORAGE_KEY = "spoiler-free";
/** On <html> while the mode is on. */
export const SPOILER_ATTR = "data-spoiler-free";
/** On <html> while one match page has been revealed (cleared when leaving it). */
export const SPOILER_REVEAL_ATTR = "data-spoiler-reveal";

/** Inline, blocking: runs before the body paints. Storage can throw (private mode): then the mode is simply off. */
export const SPOILER_BOOT_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(SPOILER_STORAGE_KEY)})==="1")document.documentElement.setAttribute(${JSON.stringify(SPOILER_ATTR)},"")}catch(e){}`;

export function setSpoilerFree(on: boolean): void {
  const html = document.documentElement;
  if (on) html.setAttribute(SPOILER_ATTR, "");
  else html.removeAttribute(SPOILER_ATTR);
  try {
    if (on) localStorage.setItem(SPOILER_STORAGE_KEY, "1");
    else localStorage.removeItem(SPOILER_STORAGE_KEY);
  } catch {
    /* storage blocked: the mode still applies until the tab closes */
  }
}
