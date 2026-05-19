import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Dumbbell, Flame, Footprints, Zap } from "lucide-react";
import { ActivityRing } from "@/components/fitness/activity-ring";
import { GoalCard } from "@/components/fitness/goal-card";
import { LifetimeTracker } from "@/components/fitness/lifetime-tracker";
import { StatCard } from "@/components/fitness/stat-card";
import { WorkoutCard } from "@/components/fitness/workout-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { addDays, todayInTz } from "@/lib/date-tz";
import { getLifetimeStats } from "@/lib/fitness/get-lifetime";
import { getSummary } from "@/lib/fitness/get-summary";
import { getUserTz } from "@/lib/user-tz";
import { DashboardCharts } from "./dashboard-charts";
import { DashboardFab } from "./dashboard-fab";
import { RefreshOnFocus } from "./refresh-on-focus";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const userTz = await getUserTz();

  // Two parallel DB-batched calls running directly inside the function — no
  // HTTP self-fetch, no client → API → DB round-trip. The previous version
  // rendered a skeleton, then fetched summary + lifetime over the network
  // from the browser, then re-rendered. Now the HTML ships with data
  // already populated and there is no skeleton flash on first paint.
  const [summary, lifetime] = await Promise.all([
    getSummary(session.user.id, userTz),
    getLifetimeStats(session.user.id),
  ]);

  const stepGoal = summary.profile?.dailyStepGoal ?? 10000;
  const calorieGoal = summary.profile?.dailyCalorieGoal ?? 2000;
  const userWeightKg: number | null = (() => {
    const raw = summary.profile?.weight ? parseFloat(summary.profile.weight) : NaN;
    if (!isFinite(raw) || raw <= 0) return null;
    return summary.profile?.preferredUnits === "imperial" ? raw * 0.453592 : raw;
  })();
  const stepsPercent = Math.min((summary.today.steps / stepGoal) * 100, 100);
  const caloriesPercent = Math.min((summary.today.caloriesBurned / calorieGoal) * 100, 100);
  const activeMinutesPercent = Math.min((summary.today.activeMinutes / 60) * 100, 100);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const weeklyChartData = buildWeeklyChartData(summary.weeklyStats, todayInTz(userTz));
  const calorieMap = new Map(summary.weeklyStats.map((s) => [s.date, s.caloriesBurned]));
  const calorieChartData = weeklyChartData.map((d) => ({
    date: d.date,
    caloriesBurned: calorieMap.get(d.date) ?? 0,
  }));

  return (
    <div className="container mx-auto space-y-6 p-6">
      <RefreshOnFocus />

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

      <DashboardCharts weeklyData={weeklyChartData} calorieData={calorieChartData} />

      <LifetimeTracker stats={lifetime} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
                <Link
                  key={w.id}
                  href={`/workouts/${w.id}`}
                  aria-label={`Open workout: ${w.name}`}
                  className="focus-visible:ring-ring block rounded-lg transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:outline-none"
                >
                  <WorkoutCard workout={w} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

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

      <DashboardFab userWeightKg={userWeightKg} />
    </div>
  );
}

/**
 * Fills in any missing days over the last 7 days with zero values so the bar
 * chart always shows a complete week. The `today` anchor is computed from
 * the user's IANA timezone on the server (via todayInTz) — not from the
 * browser's wall clock — since this now runs server-side.
 */
function buildWeeklyChartData(
  stats: Array<{ date: string; steps: number }>,
  today: string
): Array<{ date: string; steps: number }> {
  const result: Array<{ date: string; steps: number }> = [];
  const statsMap = new Map(stats.map((s) => [s.date, s.steps]));

  for (let i = 6; i >= 0; i--) {
    const dateStr = addDays(today, -i);
    result.push({
      date: dateStr,
      steps: statsMap.get(dateStr) ?? 0,
    });
  }

  return result;
}
