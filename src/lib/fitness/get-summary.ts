import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { addDays, daysBetween, mondayOf, todayInTz } from "@/lib/date-tz";
import { db } from "@/lib/db";
import { dailyStats, goals, userProfile, workouts } from "@/lib/schema";

/**
 * Dashboard summary: all the data the dashboard page needs in a single
 * parallel-batched DB round-trip. Extracted from
 * /api/fitness/summary so the dashboard Server Component can call it
 * directly without an HTTP self-fetch, and the API route can keep working
 * for any other consumers by delegating here.
 *
 * Returns a JSON-serializable shape — safe to hand to a Client Component
 * as a prop or to Response.json() from the route handler.
 */

export interface SummaryWorkout {
  id: string;
  type: string;
  name: string;
  durationMinutes: number;
  caloriesBurned: number;
  distanceKm: string | null;
  workoutDate: string;
}

export interface SummaryGoal {
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
}

export interface SummaryWeeklyStat {
  date: string;
  steps: number;
  distanceKm: string;
  caloriesBurned: number;
  activeMinutes: number;
}

export interface SummaryProfile {
  // These columns are nullable in the schema (defaults apply only on insert),
  // so we return null when the row is missing the value — the dashboard
  // applies its own display defaults at the use site.
  dailyStepGoal: number | null;
  dailyCalorieGoal: number | null;
  weight: string | null;
  preferredUnits: string | null;
}

export interface Summary {
  today: {
    date: string;
    steps: number;
    distanceKm: string;
    caloriesBurned: number;
    activeMinutes: number;
  };
  streak: number;
  weeklyWorkoutCount: number;
  recentWorkouts: SummaryWorkout[];
  activeGoals: SummaryGoal[];
  weeklyStats: SummaryWeeklyStat[];
  profile: SummaryProfile | null;
}

function calculateStreak(stats: { date: string; steps: number }[], today: string): number {
  if (stats.length === 0) return 0;

  const sorted = [...stats].sort((a, b) => (a.date < b.date ? 1 : -1));
  const yesterday = addDays(today, -1);
  const first = sorted[0];
  if (!first) return 0;

  if (first.date !== today && first.date !== yesterday) return 0;

  let streak = 0;
  let expected = first.date;
  for (const stat of sorted) {
    if (stat.date !== expected) break;
    if (stat.steps <= 0) break;
    streak += 1;
    expected = addDays(expected, -1);
  }
  return streak;
}

export async function getSummary(userId: string, tz: string): Promise<Summary> {
  const today = todayInTz(tz);
  const weekAgo = addDays(today, -7);
  const monthAgo = addDays(today, -30);
  const mondayStr = mondayOf(today);

  const [
    todayStatsResult,
    todayWorkoutTotalsResult,
    recentStats,
    weeklyStats,
    weekWorkouts,
    recentWorkouts,
    activeGoals,
    profileResult,
    weeklyWorkoutCaloriesByDate,
  ] = await Promise.all([
    db
      .select()
      .from(dailyStats)
      .where(and(eq(dailyStats.userId, userId), eq(dailyStats.date, today)))
      .limit(1),

    db
      .select({
        calories: sql<number>`COALESCE(SUM(${workouts.caloriesBurned}), 0)::int`,
        minutes: sql<number>`COALESCE(SUM(${workouts.durationMinutes}), 0)::int`,
        distanceKm: sql<string>`COALESCE(SUM(${workouts.distanceKm}), 0)::text`,
      })
      .from(workouts)
      .where(and(eq(workouts.userId, userId), eq(workouts.workoutDate, today))),

    db
      .select()
      .from(dailyStats)
      .where(and(eq(dailyStats.userId, userId), gte(dailyStats.date, monthAgo)))
      .orderBy(desc(dailyStats.date)),

    db
      .select()
      .from(dailyStats)
      .where(and(eq(dailyStats.userId, userId), gte(dailyStats.date, weekAgo)))
      .orderBy(dailyStats.date),

    db
      .select()
      .from(workouts)
      .where(
        and(
          eq(workouts.userId, userId),
          gte(workouts.workoutDate, mondayStr),
          lte(workouts.workoutDate, today)
        )
      ),

    db
      .select()
      .from(workouts)
      .where(eq(workouts.userId, userId))
      .orderBy(desc(workouts.workoutDate), desc(workouts.createdAt))
      .limit(5),

    db
      .select()
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.completed, false)))
      .orderBy(desc(goals.createdAt)),

    db.select().from(userProfile).where(eq(userProfile.userId, userId)).limit(1),

    db
      .select({
        date: workouts.workoutDate,
        calories: sql<number>`COALESCE(SUM(${workouts.caloriesBurned}), 0)::int`,
      })
      .from(workouts)
      .where(
        and(
          eq(workouts.userId, userId),
          gte(workouts.workoutDate, weekAgo),
          lte(workouts.workoutDate, today)
        )
      )
      .groupBy(workouts.workoutDate),
  ]);

  const todayStats = todayStatsResult[0];
  const profile = profileResult[0];
  const workoutTotals = todayWorkoutTotalsResult[0] ?? {
    calories: 0,
    minutes: 0,
    distanceKm: "0",
  };

  const baseSteps = todayStats?.steps ?? 0;
  const baseCalories = todayStats?.caloriesBurned ?? 0;
  const baseMinutes = todayStats?.activeMinutes ?? 0;
  const baseDistance = todayStats ? parseFloat(todayStats.distanceKm) : 0;
  const workoutDistance = parseFloat(workoutTotals.distanceKm) || 0;

  const todayCombined = {
    date: today,
    steps: baseSteps,
    distanceKm: (baseDistance + workoutDistance).toString(),
    caloriesBurned: baseCalories + workoutTotals.calories,
    activeMinutes: baseMinutes + workoutTotals.minutes,
  };

  const workoutCaloriesByDate = new Map(
    weeklyWorkoutCaloriesByDate.map((r) => [r.date, r.calories])
  );
  const dailyByDate = new Map(weeklyStats.map((s) => [s.date, s]));
  const allWeekDates = new Set<string>([...dailyByDate.keys(), ...workoutCaloriesByDate.keys()]);
  const enrichedWeeklyStats: SummaryWeeklyStat[] = Array.from(allWeekDates)
    .sort()
    .map((date) => {
      const row = dailyByDate.get(date);
      const workoutCals = workoutCaloriesByDate.get(date) ?? 0;
      return {
        date,
        steps: row?.steps ?? 0,
        distanceKm: row?.distanceKm ?? "0",
        caloriesBurned: (row?.caloriesBurned ?? 0) + workoutCals,
        activeMinutes: row?.activeMinutes ?? 0,
      };
    });

  const streak = calculateStreak(recentStats, today);

  // Explicit field pick — the goal row carries userId, createdAt, updatedAt
  // that the dashboard doesn't render. Spreading the row would ship those
  // fields across the RSC→Client serialization boundary and into the page's
  // network payload. List the SummaryGoal fields exactly so the boundary
  // stays narrow.
  const goalsWithProgress: SummaryGoal[] = activeGoals.map((goal) => {
    const target = parseFloat(goal.targetValue);
    const current = parseFloat(goal.currentValue);
    const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    const daysRemaining = goal.endDate ? Math.max(0, daysBetween(today, goal.endDate)) : null;
    return {
      id: goal.id,
      type: goal.type,
      targetValue: goal.targetValue,
      currentValue: goal.currentValue,
      unit: goal.unit,
      startDate: goal.startDate,
      endDate: goal.endDate,
      completed: goal.completed,
      progress,
      daysRemaining,
    };
  });

  const profileShape: SummaryProfile | null = profile
    ? {
        dailyStepGoal: profile.dailyStepGoal,
        dailyCalorieGoal: profile.dailyCalorieGoal,
        weight: profile.weight,
        preferredUnits: profile.preferredUnits,
      }
    : null;

  return {
    today: todayCombined,
    streak,
    weeklyWorkoutCount: weekWorkouts.length,
    recentWorkouts: recentWorkouts.map((w) => ({
      id: w.id,
      type: w.type,
      name: w.name,
      durationMinutes: w.durationMinutes,
      caloriesBurned: w.caloriesBurned,
      distanceKm: w.distanceKm,
      workoutDate: w.workoutDate,
    })),
    activeGoals: goalsWithProgress,
    weeklyStats: enrichedWeeklyStats,
    profile: profileShape,
  };
}
