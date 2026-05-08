"use client";

import { CalendarDays, CalendarRange, Trophy } from "lucide-react";
import { StatCard } from "@/components/fitness/stat-card";
import { Skeleton } from "@/components/ui/skeleton";

export interface WorkoutTotalsData {
  week: number;
  month: number;
  year: number;
}

interface WorkoutTotalsProps {
  totals: WorkoutTotalsData | null;
  loading?: boolean;
}

export function WorkoutTotals({ totals, loading }: WorkoutTotalsProps) {
  if (loading || !totals) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const unit = (n: number) => (n === 1 ? "workout" : "workouts");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        title="This Week"
        value={totals.week}
        unit={unit(totals.week)}
        icon={CalendarDays}
        color="bg-blue-500/10 text-blue-500"
      />
      <StatCard
        title="This Month"
        value={totals.month}
        unit={unit(totals.month)}
        icon={CalendarRange}
        color="bg-purple-500/10 text-purple-500"
      />
      <StatCard
        title="This Year"
        value={totals.year}
        unit={unit(totals.year)}
        icon={Trophy}
        color="bg-amber-500/10 text-amber-500"
      />
    </div>
  );
}
