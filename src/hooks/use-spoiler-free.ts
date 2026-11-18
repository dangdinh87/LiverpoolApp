"use client";

import { useSyncExternalStore } from "react";
import { SPOILER_ATTR } from "@/lib/spoiler-mode";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: [SPOILER_ATTR] });
  return () => observer.disconnect();
}

const readOn = () => document.documentElement.hasAttribute(SPOILER_ATTR);
const serverOff = () => false;

/** Whether spoiler-free mode is on, kept in sync with the <html> attribute (false on the server). */
export function useSpoilerFree(): boolean {
  return useSyncExternalStore(subscribe, readOn, serverOff);
}
