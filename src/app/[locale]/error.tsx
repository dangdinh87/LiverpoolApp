"use client";

import { ErrorBoundary } from "@/components/ui/error-boundary";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorBoundary reset={reset} digest={error.digest} />;
}
