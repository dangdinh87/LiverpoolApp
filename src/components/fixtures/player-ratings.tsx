"use client";

import { useEffect, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getRatingsState, saveRatings, type PredictionWriteError, type RatingsState } from "@/app/actions/predictions";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

/** Colour of a fan average: the usual football-ratings bands. */
const band = (r: number) => (r >= 7.5 ? "text-green-400" : r >= 6 ? "text-lfc-gold" : "text-red-400");

/**
 * Fans rate Liverpool's players 1-10 after the match (for a week), and everyone
 * sees the average. Starters plus the substitutes who came on.
 */
export function PlayerRatings({ fixtureId }: { fixtureId: number }) {
  const t = useTranslations("Predict.ratings");
  const [state, setState] = useState<RatingsState | null>(null);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<PredictionWriteError | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let live = true;
    getRatingsState(fixtureId).then((s) => {
      if (!live) return;
      setState(s);
      setDraft(s.mine);
    });
    return () => {
      live = false;
    };
  }, [fixtureId]);

  if (!state?.available) return null;
  const editable = state.open && state.signedIn;
  const totalVotes = Math.max(0, ...state.players.map((p) => p.votes));

  const save = () =>
    startTransition(async () => {
      setError(null);
      const res = await saveRatings(fixtureId, draft);
      if (res.ok) {
        setSaved(true);
        getRatingsState(fixtureId).then(setState);
      } else setError(res.error);
    });

  return (
    <section aria-labelledby="ratings-title" className="surface mt-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="ratings-title" className="font-bebas text-3xl leading-none text-white">
          {t("title")}
        </h2>
        <p className="text-sm text-stadium-muted">{t("votes", { count: totalVotes })}</p>
      </div>
      <p className="mt-1 text-[13px] text-stadium-muted">{state.open ? t("hint") : t("closed")}</p>

      <ul className="mt-4 divide-y divide-[var(--line)]">
        {state.players.map((p) => {
          const value = draft[p.name];
          return (
            <li key={p.name} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="w-6 shrink-0 text-right font-bebas text-xl leading-none text-white/40 tabular-nums">{p.number || ""}</span>
                <span className="min-w-0 truncate text-sm font-semibold text-white">{p.name}</span>
                <span className="shrink-0 font-barlow text-xs uppercase tracking-wider text-stadium-muted">{p.pos}</span>
                <span className="ml-auto shrink-0 text-right sm:hidden">
                  {p.average !== null && <b className={cn("font-bebas text-xl", band(p.average))}>{p.average.toFixed(1)}</b>}
                </span>
              </div>
              {editable && (
                <div className="flex items-center gap-3 sm:w-64">
                  <Slider
                    min={1}
                    max={10}
                    step={1}
                    value={[value ?? 6]}
                    onValueChange={([v]) => {
                      setSaved(false);
                      setDraft((d) => ({ ...d, [p.name]: v }));
                    }}
                    thumbLabel={t("rate", { player: p.name })}
                    className={cn("h-11 flex-1", value === undefined && "opacity-50")}
                  />
                  <output className="w-6 text-center font-bebas text-2xl leading-none tabular-nums text-white">{value ?? "–"}</output>
                </div>
              )}
              <span className="hidden w-14 shrink-0 text-right sm:block">
                {p.average !== null ? (
                  <b className={cn("font-bebas text-2xl leading-none", band(p.average))} title={t("average", { count: p.votes })}>
                    {p.average.toFixed(1)}
                  </b>
                ) : (
                  <span className="text-xs text-stadium-muted">–</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {state.open && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
          {state.signedIn ? (
            <button
              type="button"
              onClick={save}
              disabled={pending || Object.keys(draft).length === 0}
              className="inline-flex min-h-11 items-center gap-2 bg-lfc-red px-5 font-barlow text-sm font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-lfc-red-dark active:scale-[0.98] disabled:opacity-50"
            >
              {saved && <Check className="size-4" aria-hidden />}
              {saved ? t("saved") : t("save")}
            </button>
          ) : (
            <Link
              href={`/auth/login?redirect=/fixtures/${fixtureId}`}
              className="inline-flex min-h-11 items-center bg-lfc-red px-5 font-barlow text-sm font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-lfc-red-dark"
            >
              {t("signIn")}
            </Link>
          )}
          {error && <p className="text-[13px] text-stadium-muted">{t(`error.${error}`)}</p>}
        </div>
      )}
    </section>
  );
}
