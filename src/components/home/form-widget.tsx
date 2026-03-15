import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Standing } from "@/lib/types/football";
import {
  OverviewCardHeader,
  OverviewDivider,
  OverviewFooterMetric,
} from "./overview-card-shared";

interface FormWidgetProps {
  standing: Standing | null;
}

const RESULT_CONFIG = {
  W: { color: "bg-green-500", label: "Win", text: "W" },
  D: { color: "bg-amber-500", label: "Draw", text: "D" },
  L: { color: "bg-red-500", label: "Loss", text: "L" },
} as const;

export function FormWidget({ standing }: FormWidgetProps) {
  const form = standing?.form?.split("") ?? [];
  const last5 = form.slice(-5);

  const wins = last5.filter((r) => r === "W").length;
  const draws = last5.filter((r) => r === "D").length;
  const losses = last5.filter((r) => r === "L").length;

  const t = useTranslations("Common.labels");
  const bt = useTranslations("Bento");

  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <OverviewCardHeader
        title={bt("recentForm")}
        action={
          <span className="font-barlow text-[10px] text-stadium-muted/70 uppercase tracking-wider">
            {t("last5")}
          </span>
        }
      />

      {/* Form circles */}
      <div className="flex gap-2 justify-center flex-1 items-center min-h-0">
        {last5.map((result, i) => {
          const config = RESULT_CONFIG[result as keyof typeof RESULT_CONFIG];
          return (
            <div
              key={i}
              className={cn(
                "min-w-9 h-9 px-2.5 flex items-center justify-center font-bebas text-base text-white shadow-md border border-black/20",
                config?.color ?? "bg-stadium-border"
              )}
              title={config?.label}
            >
              {config?.text ?? result}
            </div>
          );
        })}
      </div>

      {/* W/D/L summary */}
      <OverviewDivider className="mt-auto" />
      <div className="grid grid-cols-3 gap-3 pt-3">
        <OverviewFooterMetric label="W" value={wins} valueClassName="text-green-400" />
        <OverviewFooterMetric label="D" value={draws} valueClassName="text-amber-400" />
        <OverviewFooterMetric label="L" value={losses} valueClassName="text-red-400" />
      </div>
    </div>
  );
}
