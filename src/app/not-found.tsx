"use client";

import NextError from "next/error";

// Reached only for paths the locale middleware skips (e.g. unknown files with an
// extension). Everything else 404s through app/[locale]/not-found.tsx.
export default function GlobalNotFound() {
  return (
    <html lang="vi">
      <body>
        <NextError statusCode={404} />
      </body>
    </html>
  );
}
