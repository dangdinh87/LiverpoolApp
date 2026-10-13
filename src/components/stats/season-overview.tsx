import { cn } from "@/lib/utils";
import type { SeasonOverview as SeasonOverviewType } from "@/lib/football/season-stats";
import { FormBadge, type FormResult } from "@/components/ui/form-badge";
import { Flame, Shield } from "lucide-react";

// ─── Pieces ─────────────────────────────────────────────────────────────────────

function StatCard({ value, label, sub, accent }: { value: string | number; label: string; sub?: string; accent?: boolean }) {
  return (
    <div className={cn(
      "relative overflow-hidden p-3 text-center sm:p-4",
      accent ? "border border-lfc-red/20 bg-lfc-red/10" : "bg-stadium-surface2",
    )}>
      {accent && <div className="absolute inset-x-0 top-0 h-0.5 bg-lfc-red" />}
      <div className={cn("font-bebas text-2xl leading-none tabular-nums sm:text-4xl", accent ? "text-brand" : "text-white")}>{value}</div>
      <div className="mt-1.5 font-barlow text-xs uppercase tracking-[0.15em] text-stadium-muted">{label}</div>
      {sub && <div className="mt-0.5 text-xs tabular-nums text-stadium-muted/80">{sub}</div>}
    </div>
  );
}

/** A labelled run of tiles: which scope the numbers belong to is said once, above them. */
function Group({ title, cols, children }: { title: string; cols: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 font-barlow text-xs font-semibold uppercase tracking-[0.15em] text-white/70 sm:mb-3">{title}</h3>
      <div className={cn("grid gap-2 sm:gap-3", cols)}>{children}</div>
    </section>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────────

interface Props {
  stats: SeasonOverviewType;
  streak: { type: "W" | "unbeaten"; count: number };
  /** Liverpool's last results in all competitions, oldest first. */
  form: FormResult[];
  labels: Record<string, string>;
}

export function SeasonOverview({ stats, streak, form, labels }: Props) {
  // The figures came in two scopes under one heading: record and goals cover every
  // competition, points and rank are the Premier League's. They are two labelled
  // groups now. Numbers are plain white (the old gold-for-wins, red-for-goals gave
  // colours no meaning); the one accent is the league points.
  const gd = stats.goalDiff > 0 ? `+${stats.goalDiff}` : String(stats.goalDiff);

  return (
    <div className="surface overflow-hidden">
      <div className="h-1 bg-linear-to-r from-lfc-red via-lfc-red/60 to-transparent" />

      <div className="space-y-5 p-4 sm:p-6">
        <Group title={labels.groupAll} cols="grid-cols-4">
          <StatCard value={stats.played} label={labels.played} />
          <StatCard value={stats.wins} label={labels.wins} sub={`${stats.winRate}%`} />
          <StatCard value={stats.draws} label={labels.draws} />
          <StatCard value={stats.losses} label={labels.losses} />
          <StatCard value={stats.goalsFor} label={labels.goalsFor} />
          <StatCard value={stats.goalsAgainst} label={labels.goalsAgainst} />
          <StatCard value={gd} label={labels.goalDiff} />
          <StatCard value={stats.cleanSheets} label={labels.cleanSheets} />
        </Group>

        <Group title={labels.groupLeague} cols="grid-cols-2 sm:max-w-sm">
          <StatCard value={stats.points || "—"} label={labels.points} accent />
          <StatCard value={stats.rank ? `#${stats.rank}` : "—"} label={labels.rank} />
        </Group>
      </div>

      {(form.length > 0 || streak.count > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-stadium-border px-4 py-3 sm:px-6">
          {form.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="font-barlow text-xs uppercase tracking-[0.15em] text-stadium-muted">{labels.recentForm}</span>
              <FormBadge results={form} />
            </div>
          )}
          {streak.count > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-white/85">
              {streak.type === "W" ? <Flame size={13} aria-hidden /> : <Shield size={13} aria-hidden />}
              {streak.type === "W" ? labels.winStreak : labels.unbeaten}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
