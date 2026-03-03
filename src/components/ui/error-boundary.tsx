"use client";

interface ErrorBoundaryProps {
  message?: string;
  reset: () => void;
}

export function ErrorBoundary({
  message = "Something went wrong loading this page.",
  reset,
}: ErrorBoundaryProps) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4">
      <div className="bg-stadium-surface border border-lfc-red/30 rounded-2xl p-8 max-w-md w-full text-center">
        <p className="font-bebas text-4xl text-lfc-red mb-2">Error</p>
        <p className="font-inter text-stadium-muted text-sm mb-6">{message}</p>
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-lfc-red text-white font-inter text-sm font-semibold rounded-lg hover:bg-lfc-red-dark transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
