"use client";

import { useEffect } from "react";

/**
 * Publishes the *visible* viewport as `--vvh` (height) and `--vvt` (top offset)
 * on <html>. On phones `100dvh` does not shrink when the on-screen keyboard
 * opens, so a full-screen chat sized with it leaves the message box behind the
 * keyboard. Full-screen chat surfaces size themselves with
 * `h-[var(--vvh,100dvh)]` and `top-[var(--vvt,0px)]` instead; without the
 * Visual Viewport API (or after cleanup) the fallbacks apply.
 */
export function useVisualViewportVars(active = true) {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) return;
    const root = document.documentElement;
    const update = () => {
      root.style.setProperty("--vvh", `${Math.round(vv.height)}px`);
      root.style.setProperty("--vvt", `${Math.round(vv.offsetTop)}px`);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      root.style.removeProperty("--vvh");
      root.style.removeProperty("--vvt");
    };
  }, [active]);
}

/** Render-only wrapper so a server layout can start the sync. */
export function ChatViewportSync() {
  useVisualViewportVars();
  return null;
}
