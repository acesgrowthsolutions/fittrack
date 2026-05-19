"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Footprints, Flame, Dumbbell, Plus, Zap, Lock } from "lucide-react";
import { toast } from "sonner";
import { UserProfile } from "@/components/auth/user-profile";
import { ActivityRing } from "@/components/fitness/activity-ring";
import { GoalCard } from "@/components/fitness/goal-card";
import { LifetimeTracker } from "@/components/fitness/lifetime-tracker";
import { StatCard } from "@/components/fitness/stat-card";
import { WorkoutCard } from "@/components/fitness/workout-card";
import { WorkoutForm } from "@/components/fitness/workout-form";
// recharts is ~95KB gzipped and only renders below-the-fold charts. Loading it
// eagerly blocked dashboard hydration (and the FAB button) for hundreds of ms
// on mid-tier mobile. Lazy-load both charts and render a skeleton in place.
// ssr: false is safe — the parent page is already a Client Component.
const WeeklyChart = dynamic(
  () => import("@/components/fitness/weekly-chart").then((m) => m.WeeklyChart),
  { ssr: false, loading: () => <Skeleton className="h-72" /> }
);
const CalorieChart = dynamic(
  () => import("@/components/fitness/calorie-chart").then((m) => m.CalorieChart),
  { ssr: false, loading: () => <Skeleton className="h-72" /> }
);
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";
import { addDays } from "@/lib/date-tz";
import { getLocalDateStr } from "@/lib/local-date";

interface SummaryData {
  today: {
    steps: number;
    distanceKm: string;
    caloriesBurned: number;
    activeMinutes: number;
  };
  streak: number;
  weeklyWorkoutCount: number;
  recentWorkouts: Array<{
    id: string;
    type: string;
    name: string;
    durationMinutes: number;
    caloriesBurned: number;
    distanceKm: string | null;
    workoutDate: string;
  }>;
  activeGoals: Array<{
    id: string;
    type: string;
    targetValue: string;
    currentValue: string;
    unit: string;
    startDate: string;
    endDate: string | null;
    completed: boolean;
    progress: number;
    daysRemaining: number | null;
  }>;
  weeklyStats: Array<{ date: string; steps: number; caloriesBurned: number }>;
  // The summary route returns the full userProfile row, so weight +
  // preferredUnits are available here too — no need for a separate
  // /api/fitness/profile fetch on the dashboard.
  profile: {
    dailyStepGoal: number;
    dailyCalorieGoal: number;
    weight: string | null;
    preferredUnits: string | null;
  } | null;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [workoutDialogOpen, setWorkoutDialogOpen] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/fitness/summary");
      if (res.status === 401) {
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch summary");
      const data = await res.json();
      setSummary(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchSummary();
    }
  }, [session, fetchSummary]);

  // Refresh whenever the user returns to the tab/window so stats stay current
  // after logging a workout on another page or coming back from another app.
  useEffect(() => {
    if (!session) return;

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchSummary();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", fetchSummary);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", fetchSummary);
    };
  }, [session, fetchSummary]);

  if (isPending) {
    return (
      <div className="container mx-auto p-6">
        <DashboardSkeleton />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <Lock className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
          <h1 className="mb-2 text-2xl font-bold">Protected Page</h1>
          <p className="text-muted-foreground mb-6">You need to sign in to access the dashboard</p>
          <UserProfile />
        </div>
      </div>
    );
  }

  if (loading || !summary) {
    return (
      <div className="container mx-auto p-6">
        <DashboardSkeleton />
      </div>
    );
  }

  const stepGoal = summary.profile?.dailyStepGoal ?? 10000;
  const calorieGoal = summary.profile?.dailyCalorieGoal ?? 2000;
  // Derive from the same summary payload instead of issuing a second
  // /api/fitness/profile request just for these two fields.
  const userWeightKg: number | null = (() => {
    const raw = summary.profile?.weight ? parseFloat(summary.profile.weight) : NaN;
    if (!isFinite(raw) || raw <= 0) return null;
    return summary.profile?.preferredUnits === "imperial" ? raw * 0.453592 : raw;
  })();
  const stepsPercent = Math.min((summary.today.steps / stepGoal) * 100, 100);
  const caloriesPercent = Math.min((summary.today.caloriesBurned / calorieGoal) * 100, 100);
  // Use 60 active minutes as a reasonable daily goal
  const activeMinutesPercent = Math.min((summary.today.activeMinutes / 60) * 100, 100);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Fill missing days in the weekly chart with zeroes
  const weeklyChartData = buildWeeklyChartData(summary.weeklyStats);
  const calorieMap = new Map(summary.weeklyStats.map((s) => [s.date, s.caloriesBurned]));

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Greeting + Streak */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {getGreeting()}, {session.user.name}!
          </h1>
          <p className="text-muted-foreground">{today}</p>
        </div>
        <div className="flex items-center gap-3">
          {summary.streak > 0 && (
            <Badge
              variant="secondary"
              className="gap-1 border-orange-500/20 bg-orange-500/10 px-3 py-1 text-sm text-orange-600 dark:text-orange-400"
            >
              <Zap className="h-3.5 w-3.5" />
              {summary.streak}-day streak
            </Badge>
          )}
        </div>
      </div>

      {/* Activity Rings */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="relative">
              <ActivityRing
                value={stepsPercent}
                size={120}
                strokeWidth={10}
                color="text-blue-500"
                label={summary.today.steps.toLocaleString()}
                sublabel={`/ ${stepGoal.toLocaleString()} steps`}
              />
            </div>
            <p className="mt-2 text-sm font-medium text-blue-500">Steps</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="relative">
              <ActivityRing
                value={caloriesPercent}
                size={120}
                strokeWidth={10}
                color="text-orange-500"
                label={summary.today.caloriesBurned.toLocaleString()}
                sublabel={`/ ${calorieGoal.toLocaleString()} kcal`}
              />
            </div>
            <p className="mt-2 text-sm font-medium text-orange-500">Calories</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="relative">
              <ActivityRing
                value={activeMinutesPercent}
                size={120}
                strokeWidth={10}
                color="text-green-500"
                label={summary.today.activeMinutes.toString()}
                sublabel="/ 60 min"
              />
            </div>
            <p className="mt-2 text-sm font-medium text-green-500">Active Minutes</p>
          </CardContent>
        </Card>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          title="Steps"
          value={summary.today.steps.toLocaleString()}
          icon={Footprints}
          color="bg-blue-500/10 text-blue-500"
        />
        <StatCard
          title="Distance"
          value={parseFloat(summary.today.distanceKm).toFixed(1)}
          unit="km"
          icon={Footprints}
          color="bg-blue-500/10 text-blue-500"
        />
        <StatCard
          title="Calories"
          value={summary.today.caloriesBurned.toLocaleString()}
          unit="kcal"
          icon={Flame}
          color="bg-orange-500/10 text-orange-500"
        />
        <StatCard
          title="Workouts This Week"
          value={summary.weeklyWorkoutCount}
          icon={Dumbbell}
          color="bg-purple-500/10 text-purple-500"
        />
      </div>

      {/* Weekly Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WeeklyChart data={weeklyChartData} />
        <CalorieChart
          data={weeklyChartData.map((d) => ({
            date: d.date,
            caloriesBurned: calorieMap.get(d.date) ?? 0,
          }))}
        />
      </div>

      {/* Lifetime Tracker */}
      <LifetimeTracker />

      {/* Bottom Row: Recent Workouts + Active Goals */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Workouts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Workouts</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/workouts">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.recentWorkouts.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                No workouts yet. Log your first workout!
              </p>
            ) : (
              summary.recentWorkouts.map((w) => (
                <WorkoutCard
                  key={w.id}
                  workout={w}
                  onClick={() => router.push(`/workouts/${w.id}`)}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Active Goals */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Active Goals</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/goals">Manage</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.activeGoals.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                No active goals. Set a goal to stay motivated!
              </p>
            ) : (
              summary.activeGoals.map((g) => <GoalCard key={g.id} goal={g} />)
            )}
          </CardContent>
        </Card>
      </div>

      {/* FAB-style Log Workout button */}
      <Dialog open={workoutDialogOpen} onOpenChange={setWorkoutDialogOpen}>
        <DialogTrigger asChild>
          <Button
            size="lg"
            className="fixed right-6 bottom-6 z-40 h-14 w-14 rounded-full shadow-lg"
          >
            <Plus className="h-6 w-6" />
            <span className="sr-only">Log Workout</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Workout</DialogTitle>
          </DialogHeader>
          <WorkoutForm
            userWeightKg={userWeightKg}
            onSuccess={() => {
              setWorkoutDialogOpen(false);
              fetchSummary();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Fills in any missing days over the last 7 days with zero values so the
 * bar chart always shows a complete week.
 */
function buildWeeklyChartData(
  stats: Array<{ date: string; steps: number }>
): Array<{ date: string; steps: number }> {
  const result: Array<{ date: string; steps: number }> = [];
  const statsMap = new Map(stats.map((s) => [s.date, s.steps]));

  const today = getLocalDateStr();
  for (let i = 6; i >= 0; i--) {
    const dateStr = addDays(today, -i);
    result.push({
      date: dateStr,
      steps: statsMap.get(dateStr) ?? 0,
    });
  }

  return result;
}
