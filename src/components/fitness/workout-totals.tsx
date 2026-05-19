import { CalendarCheck, CalendarDays, CalendarRange, Clock, Flame, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface WorkoutTotalsBucket {
  count: number;
  minutes: number;
}

export interface WorkoutTotalsData {
  streak: number;
  day: WorkoutTotalsBucket;
  week: WorkoutTotalsBucket;
  month: WorkoutTotalsBucket;
  year: WorkoutTotalsBucket;
}

interface WorkoutTotalsProps {
  totals: WorkoutTotalsData | null;
  loading?: boolean;
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

interface TotalsTileProps {
  title: string;
  bucket: WorkoutTotalsBucket;
  icon: LucideIcon;
  color: string;
}

function TotalsTile({ title, bucket, icon: Icon, color }: TotalsTileProps) {
  const unit = bucket.count === 1 ? "workout" : "workouts";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-muted-foreground text-sm">{title}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{bucket.count}</span>
              <span className="text-muted-foreground text-sm">{unit}</span>
            </div>
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              <span>{formatDuration(bucket.minutes)}</span>
            </div>
          </div>
          <div className={cn("shrink-0 rounded-lg p-2", color)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StreakBanner({ streak }: { streak: number }) {
  const active = streak > 0;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3",
        active ? "border-orange-500/20 bg-orange-500/5" : "bg-muted/40 border-border"
      )}
    >
      <div
        className={cn(
          "shrink-0 rounded-lg p-2",
          active ? "bg-orange-500/15 text-orange-500" : "bg-muted text-muted-foreground"
        )}
      >
        <Flame className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {active ? `${streak}-day workout streak` : "No active streak"}
        </p>
        <p className="text-muted-foreground text-xs">
          {active
            ? "Consecutive days with at least one workout — keep it going!"
            : "Log a workout today or yesterday to start one."}
        </p>
      </div>
    </div>
  );
}

export function WorkoutTotals({ totals, loading }: WorkoutTotalsProps) {
  if (loading || !totals) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StreakBanner streak={totals.streak} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <TotalsTile
          title="Today"
          bucket={totals.day}
          icon={CalendarCheck}
          color="bg-emerald-500/10 text-emerald-500"
        />
        <TotalsTile
          title="This Week"
          bucket={totals.week}
          icon={CalendarDays}
          color="bg-blue-500/10 text-blue-500"
        />
        <TotalsTile
          title="This Month"
          bucket={totals.month}
          icon={CalendarRange}
          color="bg-purple-500/10 text-purple-500"
        />
        <TotalsTile
          title="This Year"
          bucket={totals.year}
          icon={Trophy}
          color="bg-amber-500/10 text-amber-500"
        />
      </div>
    </div>
  );
}
