import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { RESULT_BADGE } from "@/lib/result-style";

export type FormResult = "W" | "D" | "L";

const SIZE = {
  /** Table cells and inline strips. */
  sm: "size-3.5 text-[12px] sm:size-[18px] sm:text-[14px]",
  /** Stand-alone timelines, where each square is a tap target. */
  md: "size-9 text-xl",
} as const;

/** Keep the W / D / L letters of a provider's form string ("WWDLW"), oldest first. */
export function parseForm(form: string | null | undefined, count = 5): FormResult[] {
  return (form ?? "")
    .toUpperCase()
    .split("")
    .filter((r): r is FormResult => r === "W" || r === "D" || r === "L")
    .slice(-count);
}

/**
 * One result as a filled square with its letter (T/H/B in Vietnamese, W/D/L in
 * English). The letter is what carries the meaning; the fill only echoes it, so
 * the strip still reads without telling green from red.
 *
 * Uses RESULT_BADGE rather than the dot swatches: those have no text on them
 * and green-600 under white text is 3.8:1, below AA.
 */
export function FormSquare({
  result,
  size = "sm",
  className,
}: {
  result: FormResult;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const t = useTranslations("Match");
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-bebas leading-none",
        SIZE[size],
        RESULT_BADGE[result],
        className,
      )}
    >
      {t(`resultShort.${result}`)}
    </span>
  );
}

/**
 * Recent form as one row of squares, oldest to newest (the newest sits at the
 * right edge, like the table's own Pts column). Announced once for the whole row
 * ("5 trận gần nhất: T T H B T"), not square by square.
 */
export function FormBadge({
  results,
  size = "sm",
  className,
}: {
  results: FormResult[];
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const t = useTranslations("Match");
  if (results.length === 0) return null;
  const spoken = results.map((r) => t(`resultShort.${r}`)).join(" ");
  return (
    <span
      role="img"
      aria-label={t("formAria", { count: results.length, results: spoken })}
      className={cn("inline-flex items-center gap-px sm:gap-0.5", className)}
    >
      {results.map((r, i) => (
        <FormSquare key={i} result={r} size={size} />
      ))}
    </span>
  );
}
