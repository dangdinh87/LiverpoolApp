"use client";

import Image from "next/image";
import { motion } from "framer-motion";

/* ─── Variant types ─────────────────────────────────────────── */
type LoaderVariant = "full" | "inline";

interface LfcLoaderProps {
  variant?: LoaderVariant;
  message?: string;
}

/* ─── Full Screen Loader (Logo + pulse) ────────────────────── */
function FullScreenLoader({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-stadium-bg">
      {/* Subtle radial glow */}
      <div
        className="absolute w-72 h-72 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(200,16,46,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Logo — visible immediately, gentle breathing pulse */}
      <motion.div
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/assets/lfc/crest.webp"
          alt="Liverpool FC"
          width={64}
          height={80}
          className="drop-shadow-[0_0_30px_rgba(200,16,46,0.4)]"
          priority
        />
      </motion.div>

      {/* Three-dot loading indicator */}
      <div className="flex gap-1.5 mt-6">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-lfc-red"
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Optional message */}
      {message && (
        <p className="mt-4 font-barlow text-[11px] text-stadium-muted uppercase tracking-[0.2em]">
          {message}
        </p>
      )}
    </div>
  );
}

/* ─── Inline Loader (compact) ──────────────────────────────── */
function InlineLoader({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <motion.div
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/assets/lfc/crest.webp"
          alt="Loading"
          width={40}
          height={50}
          className="drop-shadow-[0_0_20px_rgba(200,16,46,0.4)] opacity-80"
        />
      </motion.div>

      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1 h-1 rounded-full bg-lfc-red"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </div>

      {message && (
        <p className="font-barlow text-[10px] text-stadium-muted uppercase tracking-widest">
          {message}
        </p>
      )}
    </div>
  );
}

/* ─── Main Export ───────────────────────────────────────────── */
export function LfcLoader({ variant = "full", message }: LfcLoaderProps) {
  if (variant === "inline") {
    return <InlineLoader message={message} />;
  }
  return <FullScreenLoader message={message} />;
}
