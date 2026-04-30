import { headers } from "next/headers";
import { eq, and, gte, desc, lte, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dailyStats, workouts, goals, userProfile } from "@/lib/schema";

function getTodayDateStr(): string {
  return new Date().toISOString().split("T")[0] as string;
}

function getDateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0] as string;
}

/**
 * Calculate the user's current streak -- consecutive days (ending today or
 * yesterday) that have step data > 0.
 */
function calculateStreak(stats: { date: string; steps: number }[]): number {
  if (stats.length === 0) return 0;

  // Sort by date descending so the most recent day is first
  const sorted = [...stats].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const today = getTodayDateStr();
  const yesterday = getDateStr(1);

  const first = sorted[0];
  if (!first) return 0;

  // Streak must start from today or yesterday
  if (first.date !== today && first.date !== yesterday) {
    return 0;
  }

  let streak = 0;
  const expectedDate = new Date(first.date);

  for (const stat of sorted) {
    const statDate = new Date(stat.date);
    // Check if this date matches the expected date in the streak
    const statDateStr = statDate.toISOString().split("T")[0] as string;
    const expectedDateStr = expectedDate.toISOString().split("T")[0] as string;
    if (statDateStr !== expectedDateStr) {
      break;
    }
    if (stat.steps > 0) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const today = getTodayDateStr();
    const weekAgo = getDateStr(7);
    const monthAgo = getDateStr(30);

    // Compute Monday of current week for the workouts query
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(monday.getDate() - mondayOffset);
    const mondayStr = monday.toISOString().split("T")[0] as string;

    // Run all independent queries in parallel
    const [
      todayStatsResult,
      todayWorkoutTotalsResult,
      recentStats,
      weeklyStats,
      weekWorkouts,
      recentWorkouts,
      activeGoals,
      profileResult,
    ] = await Promise.all([
      // Fetch today's stats
      db
        .select()
        .from(dailyStats)
        .where(and(eq(dailyStats.userId, userId), eq(dailyStats.date, today)))
        .limit(1),

      // Aggregate today's workouts (calories, minutes, distance) so the
      // dashboard rings reflect logged workouts, not just step-based stats.
      db
        .select({
          calories: sql<number>`COALESCE(SUM(${workouts.caloriesBurned}), 0)::int`,
          minutes: sql<number>`COALESCE(SUM(${workouts.durationMinutes}), 0)::int`,
          distanceKm: sql<string>`COALESCE(SUM(${workouts.distanceKm}), 0)::text`,
        })
        .from(workouts)
        .where(and(eq(workouts.userId, userId), eq(workouts.workoutDate, today))),

      // Fetch last 30 days of stats for streak calculation
      db
        .select()
        .from(dailyStats)
        .where(and(eq(dailyStats.userId, userId), gte(dailyStats.date, monthAgo)))
        .orderBy(desc(dailyStats.date)),

      // Fetch last 7 days of stats for weekly chart
      db
        .select()
        .from(dailyStats)
        .where(and(eq(dailyStats.userId, userId), gte(dailyStats.date, weekAgo)))
        .orderBy(dailyStats.date),

      // Fetch this week's workouts (since Monday)
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

      // Fetch recent 5 workouts
      db
        .select()
        .from(workouts)
        .where(eq(workouts.userId, userId))
        .orderBy(desc(workouts.workoutDate), desc(workouts.createdAt))
        .limit(5),

      // Fetch active (incomplete) goals
      db
        .select()
        .from(goals)
        .where(and(eq(goals.userId, userId), eq(goals.completed, false)))
        .orderBy(desc(goals.createdAt)),

      // Fetch user profile for step goal
      db.select().from(userProfile).where(eq(userProfile.userId, userId)).limit(1),
    ]);

    const todayStats = todayStatsResult[0];
    const profile = profileResult[0];
    const workoutTotals = todayWorkoutTotalsResult[0] ?? {
      calories: 0,
      minutes: 0,
      distanceKm: "0",
    };

    // Step-based stats live in daily_stats; workout stats live in workouts.
    // Combine both so today's rings reflect total daily activity.
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

    // Calculate streak
    const streak = calculateStreak(recentStats);

    // Calculate goal progress percentages
    const goalsWithProgress = activeGoals.map((goal) => {
      const target = parseFloat(goal.targetValue);
      const current = parseFloat(goal.currentValue);
      const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;

      let daysRemaining: number | null = null;
      if (goal.endDate) {
        const end = new Date(goal.endDate);
        const diffMs = end.getTime() - new Date().getTime();
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }

      return { ...goal, progress, daysRemaining };
    });

    return Response.json({
      today: todayCombined,
      streak,
      weeklyWorkoutCount: weekWorkouts.length,
      recentWorkouts,
      activeGoals: goalsWithProgress,
      weeklyStats,
      profile: profile ?? null,
    });
  } catch (error) {
    console.error("Error fetching summary:", error);
    return Response.json({ error: "Failed to fetch summary" }, { status: 500 });
  }
}
