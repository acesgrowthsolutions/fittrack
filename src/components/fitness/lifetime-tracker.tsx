import { Calendar, CalendarCheck, CalendarDays, CalendarRange } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LifetimeStats } from "@/lib/lifetime-stats";

// Pure presentational component. The stats are fetched by the caller (the
// dashboard Server Component reads them directly from the DB via
// getLifetimeStats) and handed in. The previous self-fetching client version
// is gone — the data is part of the initial HTML, so the tracker no longer
// shows a skeleton flash on dashboard load.

interface TileProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

function Tile({ label, value, icon: Icon, color }: TileProps) {
  return (
    <div className="bg-muted/30 flex items-center gap-3 rounded-lg border p-3">
      <div className={`shrink-0 rounded-lg p-2 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl leading-tight font-bold tabular-nums">{value.toLocaleString()}</p>
        <p className="text-muted-foreground text-xs tracking-wide uppercase">{label}</p>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  // Parse as UTC midnight to avoid tz-shift labels (the string is already a
  // user-local calendar date; we just want its weekday/month rendering).
  const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

interface LifetimeTrackerProps {
  stats: LifetimeStats;
}

export function LifetimeTracker({ stats }: LifetimeTrackerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Your Journey</CardTitle>
        <CardDescription>
          {stats.firstActiveDate
            ? `Active since ${formatDate(stats.firstActiveDate)}`
            : "Log a workout, steps, or a meal to start your tracker"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile
            label="Days"
            value={stats.days}
            icon={CalendarCheck}
            color="bg-emerald-500/10 text-emerald-500"
          />
          <Tile
            label="Weeks"
            value={stats.weeks}
            icon={CalendarDays}
            color="bg-blue-500/10 text-blue-500"
          />
          <Tile
            label="Months"
            value={stats.months}
            icon={CalendarRange}
            color="bg-purple-500/10 text-purple-500"
          />
          <Tile
            label="Years"
            value={stats.years}
            icon={Calendar}
            color="bg-amber-500/10 text-amber-500"
          />
        </div>
      </CardContent>
    </Card>
  );
}
