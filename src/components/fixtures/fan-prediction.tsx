"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Minus, Plus, Trophy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { withLocalePrefix } from "@/i18n/routing";
import { getPredictionState, savePrediction, type PredictionState, type PredictionWriteError } from "@/app/actions/predictions";
import { predictionPoints } from "@/lib/fan-predictions/scoring";
import type { Fixture } from "@/lib/types/football";
import { cn } from "@/lib/utils";
import { displayTeamName } from "./team-name";

const FINISHED = new Set(["FT", "AET", "PEN"]);

function Stepper({ value, onChange, label, disabled }: { value: number; onChange: (n: number) => void; label: string; disabled: boolean }) {
  const btn =
    "flex size-11 shrink-0 cursor-pointer items-center justify-center border border-[var(--line-strong)] text-white transition-colors hover:border-white/40 hover:bg-white/5 active:scale-[0.97] active:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <div className="flex shrink-0 items-center gap-2" role="group" aria-label={label}>
      <button type="button" className={btn} disabled={disabled || value <= 0} onClick={() => onChange(value - 1)} aria-label={`${label} −1`}>
        <Minus className="size-4" aria-hidden />
      </button>
      <output className="w-9 text-center font-bebas text-4xl leading-none tabular-nums text-white sm:w-10 sm:text-5xl" aria-live="polite">
        {value}
      </output>
      <button type="button" className={btn} disabled={disabled || value >= 20} onClick={() => onChange(value + 1)} aria-label={`${label} +1`}>
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/**
 * "Your prediction" on a match page: pick a score until kick-off, see what
 * everyone else picked, and (once played) how many points the pick earned.
 *
 * Renders a matching skeleton shell while loading so `#predict-title` anchor
 * links resolve immediately on arrival and loading causes zero layout shift.
 */
export function FanPrediction({ fixture }: { fixture: Fixture }) {
  const t = useTranslations("Predict");
  const locale = useLocale();
  const { fixture: f, teams, goals } = fixture;
  const [state, setState] = useState<PredictionState | null>(null);
  const [pick, setPick] = useState({ home: 1, away: 1 });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<PredictionWriteError | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let live = true;
    getPredictionState(f.id)
      .then((s) => {
        if (!live) return;
        setState(s);
        if (s.mine) setPick(s.mine);
      })
      .catch(() => {
        if (live) {
          setState({
            available: false,
            open: false,
            signedIn: false,
            mine: null,
            community: { count: 0, split: { home: 0, draw: 0, away: 0 }, topScores: [] },
          });
        }
      });
    return () => {
      live = false;
    };
  }, [f.id]);

  // Synthetic cup IDs (<= 0) never have predictions.
  if (f.id <= 0) return null;

  if (state === null) {
    return (
      <section aria-labelledby="predict-title" aria-busy="true" className="surface mt-6 p-4 sm:p-6">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="predict-title" className="font-bebas text-3xl leading-none text-white">
            {t("title")}
          </h2>
          <span aria-hidden className="skeleton h-4 w-24" />
        </div>
        <div aria-hidden className="mt-5 space-y-3">
          <div className="skeleton h-12 w-full" />
          <div className="skeleton h-11 w-40" />
        </div>
      </section>
    );
  }

  if (!state.available) return null;

  const homeName = displayTeamName(teams.home.name);
  const awayName = displayTeamName(teams.away.name);
  const finished = FINISHED.has(f.status.short) && goals.home !== null && goals.away !== null;
  const points = finished && state.mine ? predictionPoints(state.mine, { home: goals.home!, away: goals.away! }) : null;
  const editable = state.open && state.signedIn;
  const redirectTarget = withLocalePrefix(`/fixtures/${f.id}`, locale);

  const save = () =>
    startTransition(async () => {
      setError(null);
      const res = await savePrediction(f.id, pick.home, pick.away);
      if (res.ok) {
        setSaved(true);
        setState((s) => (s ? { ...s, mine: pick } : s));
        getPredictionState(f.id).then(setState).catch(() => {});
      } else setError(res.error);
    });

  const { community } = state;
  const update = (side: "home" | "away") => (n: number) => {
    setSaved(false);
    setPick((p) => ({ ...p, [side]: n }));
  };

  return (
    <section aria-labelledby="predict-title" className="surface mt-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="predict-title" className="font-bebas text-3xl leading-none text-white">
          {t("title")}
        </h2>
        <p className="text-sm text-stadium-muted tabular-nums">{t("count", { count: community.count })}</p>
      </div>

      {/* Pick: two clean stacked rows on 390px phones (no overflow), 3-column row from sm */}
      {state.open ? (
        <>
          <div className="mt-5 flex flex-col gap-3 sm:hidden">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-semibold text-white">{homeName}</p>
              <Stepper value={pick.home} onChange={update("home")} label={homeName} disabled={!editable} />
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] pt-3">
              <p className="min-w-0 truncate text-sm font-semibold text-white">{awayName}</p>
              <Stepper value={pick.away} onChange={update("away")} label={awayName} disabled={!editable} />
            </div>
          </div>

          <div className="mt-5 hidden sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-5">
            <p className="min-w-0 truncate text-right text-base font-semibold text-white">{homeName}</p>
            <div className="flex items-center gap-4">
              <Stepper value={pick.home} onChange={update("home")} label={homeName} disabled={!editable} />
              <span className="font-bebas text-3xl text-stadium-muted">–</span>
              <Stepper value={pick.away} onChange={update("away")} label={awayName} disabled={!editable} />
            </div>
            <p className="min-w-0 truncate text-base font-semibold text-white">{awayName}</p>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-white/85">
          {state.mine ? t("yourPick", { home: state.mine.home, away: state.mine.away }) : t("closedNoPick")}
          {points !== null && (
            <span className="spoiler-hide ml-2 inline-flex items-center gap-1.5 font-semibold text-lfc-gold tabular-nums">
              <Trophy className="size-4" aria-hidden />
              {t("points", { count: points })}
            </span>
          )}
        </p>
      )}

      {state.open && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {state.signedIn ? (
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 bg-lfc-red px-5 font-barlow text-sm font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-lfc-red-dark active:scale-[0.97] disabled:opacity-60"
            >
              {saved && <Check className="size-4" aria-hidden />}
              {saved ? t("saved") : state.mine ? t("update") : t("save")}
            </button>
          ) : (
            <Link
              href={`/auth/login?redirect=${encodeURIComponent(redirectTarget)}`}
              className="inline-flex min-h-11 items-center bg-lfc-red px-5 font-barlow text-sm font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-lfc-red-dark active:scale-[0.97]"
            >
              {t("signIn")}
            </Link>
          )}
          <p className="text-[13px] text-stadium-muted">{error ? t(`error.${error}`) : t("rule")}</p>
        </div>
      )}

      {/* What everyone picked */}
      {community.count > 0 && (
        <div className="mt-6 border-t border-[var(--line)] pt-4">
          <div className="mb-2 flex justify-between gap-2 text-xs text-stadium-muted tabular-nums">
            <span className="min-w-0 truncate">{t("win", { team: homeName })} <b className="text-white">{community.split.home}%</b></span>
            <span className="shrink-0">{t("draw")} <b className="text-white">{community.split.draw}%</b></span>
            <span className="min-w-0 truncate text-right">{t("win", { team: awayName })} <b className="text-white">{community.split.away}%</b></span>
          </div>
          <div className="flex h-1.5 gap-0.5" aria-hidden>
            <div className={cn("h-full", teams.home.id === 40 ? "bg-lfc-red" : "bg-white/50")} style={{ width: `${community.split.home}%` }} />
            <div className="h-full bg-white/20" style={{ width: `${community.split.draw}%` }} />
            <div className={cn("h-full flex-1", teams.away.id === 40 ? "bg-lfc-red" : "bg-white/50")} />
          </div>
          {community.topScores.length > 0 && (
            <p className="mt-3 text-[13px] text-stadium-muted">
              {t("mostPicked")}{" "}
              {community.topScores.map((s, i) => (
                <span key={`${s.home}-${s.away}`}>
                  {i > 0 && ", "}
                  <b className="font-semibold text-white tabular-nums">{s.home}–{s.away}</b> ({s.share}%)
                </span>
              ))}
            </p>
          )}
        </div>
      )}

      <p className="mt-4 text-[13px]">
        <Link href="/predictions" className="text-brand underline underline-offset-4 hover:text-white">
          {t("leaderboardLink")}
        </Link>
      </p>
    </section>
  );
}
