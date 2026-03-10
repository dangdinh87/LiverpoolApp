"use client";

interface ErrorBoundaryProps {
  message?: string;
  reset: () => void;
}

export function ErrorBoundary({
  message = "Unable to load data. Please try again later. / Không thể tải dữ liệu. Vui lòng thử lại sau.",
  reset,
}: ErrorBoundaryProps) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4">
      <div className="bg-stadium-surface border border-lfc-red/30 rounded-none p-8 max-w-md w-full text-center">
        <p className="font-bebas text-4xl text-lfc-red mb-2">Error</p>
        <p className="font-inter text-stadium-muted text-sm mb-6">{message}</p>
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-lfc-red text-white font-barlow font-bold uppercase tracking-[0.12em] text-sm rounded-none hover:bg-lfc-red-dark transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
