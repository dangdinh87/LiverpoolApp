"use client";

import { ErrorBoundary } from "@/components/ui/error-boundary";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <ErrorBoundary reset={reset} />;
}
