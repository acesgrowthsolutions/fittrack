"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, CalendarCheck, CalendarDays, CalendarRange } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface LifetimeStats {
  days: number;
  weeks: number;
  months: number;
  years: number;
  firstActiveDate: string | null;
  lastActiveDate: string | null;
}

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

export function LifetimeTracker() {
  const [stats, setStats] = useState<LifetimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/fitness/lifetime", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed");
      setStats(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Journey</CardTitle>
          <CardDescription>How long you've been tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return null;
  }

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
