"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LfcLoader } from "@/components/ui/lfc-loader";

const SPLASH_KEY = "lfc-splash-seen";
const SPLASH_DURATION = 3500; // ms — enough for full animation sequence

export function SplashScreen({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    /* Show splash only once per browser session */
    if (!sessionStorage.getItem(SPLASH_KEY)) {
      setShowSplash(true);
      sessionStorage.setItem(SPLASH_KEY, "1");
      const timer = setTimeout(() => setShowSplash(false), SPLASH_DURATION);
      return () => clearTimeout(timer);
    }
  }, []);

  /* SSR: render children immediately, no flash */
  if (!mounted) return <>{children}</>;

  return (
    <>
      <AnimatePresence mode="wait">
        {showSplash && (
          <motion.div
            key="splash"
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          >
            <LfcLoader variant="full" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content always renders underneath — becomes visible when splash exits */}
      <div style={showSplash ? { visibility: "hidden" } : undefined}>
        {children}
      </div>
    </>
  );
}
