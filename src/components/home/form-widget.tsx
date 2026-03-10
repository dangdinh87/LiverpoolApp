import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Standing } from "@/lib/types/football";

interface FormWidgetProps {
  standing: Standing | null;
}

const RESULT_CONFIG = {
  W: { color: "bg-green-500", label: "Win", text: "W" },
  D: { color: "bg-yellow-500", label: "Draw", text: "D" },
  L: { color: "bg-red-500", label: "Loss", text: "L" },
} as const;

export function FormWidget({ standing }: FormWidgetProps) {
  const form = standing?.form?.split("") ?? [];
  const last5 = form.slice(-5);

  const wins = last5.filter((r) => r === "W").length;
  const draws = last5.filter((r) => r === "D").length;
  const losses = last5.filter((r) => r === "L").length;

  const t = useTranslations("Common.labels");

  return (
    <div className="flex flex-col gap-4 p-5 h-full">
      <div className="flex items-center justify-between">
        <span className="font-barlow text-stadium-muted text-xs uppercase tracking-widest font-semibold">
          Recent Form
        </span>
        <span className="font-barlow text-[10px] text-stadium-muted/70 uppercase tracking-wider">{t("last5")}</span>
      </div>

      {/* Form circles */}
      <div className="flex gap-2.5 justify-center flex-1 items-center">
        {last5.map((result, i) => {
          const config = RESULT_CONFIG[result as keyof typeof RESULT_CONFIG];
          return (
            <div
              key={i}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-bebas text-white text-lg shadow-md",
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
      <div className="flex justify-around border-t border-stadium-border/50 pt-3 mt-auto">
        <div className="text-center">
          <p className="font-bebas text-2xl text-green-400">{wins}</p>
          <p className="font-barlow text-[10px] text-stadium-muted uppercase tracking-wider">W</p>
        </div>
        <div className="text-center">
          <p className="font-bebas text-2xl text-yellow-400">{draws}</p>
          <p className="font-barlow text-[10px] text-stadium-muted uppercase tracking-wider">D</p>
        </div>
        <div className="text-center">
          <p className="font-bebas text-2xl text-red-400">{losses}</p>
          <p className="font-barlow text-[10px] text-stadium-muted uppercase tracking-wider">L</p>
        </div>
      </div>
    </div>
  );
}
