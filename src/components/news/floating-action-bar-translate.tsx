"use client";

import { FloatingActionBar } from "./floating-action-bar";
import { useTranslate } from "./translate-button";

/** Wrapper that connects FloatingActionBar to TranslateProvider context (EN articles only). */
export function FloatingActionBarWithTranslate(
  props: Omit<React.ComponentProps<typeof FloatingActionBar>, "isEnglish" | "onTranslate" | "translateMode">
) {
  const { mode, handleTranslate } = useTranslate();

  return (
    <FloatingActionBar
      {...props}
      isEnglish
      onTranslate={handleTranslate}
      translateMode={mode}
    />
  );
}
