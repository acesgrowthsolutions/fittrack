"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// recharts is ~95KB gzipped, only renders below-the-fold, and touches `window`
// during render so it cannot be server-rendered. Wrap the lazy import in this
// client island — Server Components cannot pass `ssr: false` to dynamic(),
// but a Client Component can.
const WeeklyChart = dynamic(
  () => import("@/components/fitness/weekly-chart").then((m) => m.WeeklyChart),
  { ssr: false, loading: () => <Skeleton className="h-72" /> }
);
const CalorieChart = dynamic(
  () => import("@/components/fitness/calorie-chart").then((m) => m.CalorieChart),
  { ssr: false, loading: () => <Skeleton className="h-72" /> }
);

interface DashboardChartsProps {
  weeklyData: Array<{ date: string; steps: number }>;
  calorieData: Array<{ date: string; caloriesBurned: number }>;
}

export function DashboardCharts({ weeklyData, calorieData }: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <WeeklyChart data={weeklyData} />
      <CalorieChart data={calorieData} />
    </div>
  );
}
