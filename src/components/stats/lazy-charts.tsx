"use client";

/**
 * Recharts is ~100KB+ of JS. These wrappers load it on the client only, in a
 * separate chunk, behind a skeleton of the same height as the finished chart
 * (so nothing shifts), keeping it out of every other page's first load.
 */
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const box = (h: string) =>
  function ChartSkeleton() {
    return <Skeleton className={`w-full ${h}`} />;
  };

export const LazyStatChart = dynamic(() => import("./stat-chart").then((m) => m.StatChart), {
  ssr: false,
  loading: box("h-[280px]"),
});

export const LazyGoalsByMonthChart = dynamic(() => import("./goals-by-month-chart").then((m) => m.GoalsByMonthChart), {
  ssr: false,
  loading: box("h-[250px]"),
});

export const LazyHomeAwayChart = dynamic(() => import("./home-away-chart").then((m) => m.HomeAwayChart), {
  ssr: false,
  loading: box("h-[250px]"),
});

export const LazySeasonComparison = dynamic(() => import("./season-comparison").then((m) => m.SeasonComparison), {
  ssr: false,
  loading: box("h-[720px]"),
});
