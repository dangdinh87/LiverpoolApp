import { cn } from "@/lib/utils";

export function OverviewCardHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 min-h-5">
      <span className="font-barlow text-stadium-muted text-xs uppercase tracking-widest font-semibold">
        {title}
      </span>
      {action}
    </div>
  );
}

export function OverviewInfoTile({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border border-stadium-border/60 bg-transparent px-3 py-2", className)}>
      <p className="font-barlow text-[9px] uppercase tracking-[0.18em] text-stadium-muted mb-1">
        {label}
      </p>
      <div className="font-bebas text-lg text-white leading-none">
        {value}
      </div>
    </div>
  );
}

export function OverviewDivider({ className }: { className?: string }) {
  return <div className={cn("border-t border-stadium-border/50", className)} />;
}

export function OverviewFooterMetric({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div>
      <p className="font-barlow text-[10px] uppercase tracking-[0.18em] text-stadium-muted mb-1">
        {label}
      </p>
      <p className={cn("font-bebas text-2xl text-white leading-none", valueClassName)}>{value}</p>
    </div>
  );
}
