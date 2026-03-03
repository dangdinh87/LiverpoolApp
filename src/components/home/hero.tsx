"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

export function Hero() {
  return (
    <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Background image via CSS — avoids next/image domain config complexity */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1920&q=80&auto=format&fit=crop')`,
        }}
      />

      {/* Gradient overlay layers */}
      <div className="absolute inset-0 bg-gradient-to-t from-stadium-bg via-stadium-bg/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-stadium-bg/40 via-transparent to-stadium-bg/40" />

      {/* Red accent line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-lfc-red to-transparent" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="font-barlow text-lfc-red uppercase tracking-[0.3em] text-sm font-semibold mb-4"
        >
          Liverpool Football Club · Est. 1892
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="font-bebas text-7xl sm:text-8xl md:text-[9rem] lg:text-[11rem] text-white leading-none tracking-wider mb-6"
        >
          You&apos;ll Never
          <br />
          <span className="text-lfc-red">Walk Alone</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="text-stadium-muted font-inter text-lg max-w-md mx-auto"
        >
          The home of Liverpool FC — results, stats, squad, and more.
        </motion.p>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-stadium-muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="w-6 h-6" />
        </motion.div>
      </motion.div>
    </section>
  );
}
