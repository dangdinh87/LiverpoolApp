"use client";

import { useSyncExternalStore } from "react";
import { SPOILER_ATTR, SPOILER_REVEAL_ATTR } from "@/lib/spoiler-mode";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: [SPOILER_ATTR, SPOILER_REVEAL_ATTR] });
  return () => observer.disconnect();
}

const readOn = () => document.documentElement.hasAttribute(SPOILER_ATTR);
const readRevealed = () => document.documentElement.hasAttribute(SPOILER_REVEAL_ATTR);
const serverOff = () => false;

/** Whether spoiler-free mode is on, kept in sync with the <html> attribute (false on the server). */
export function useSpoilerFree(): boolean {
  return useSyncExternalStore(subscribe, readOn, serverOff);
}

/** Whether the current match page has been revealed while the mode is on. */
export function useSpoilerRevealed(): boolean {
  return useSyncExternalStore(subscribe, readRevealed, serverOff);
}
