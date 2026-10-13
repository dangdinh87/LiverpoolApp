import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * A topic tag ("Chuyển nhượng"): outlined and quiet, 12px. Pass the classes
 * from CATEGORY_CONFIG for the border and text colour.
 */
export function CategoryTag({ label, className }: { label: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("px-2 font-barlow text-xs font-semibold uppercase tracking-wider", className)}>
      {label}
    </Badge>
  );
}
