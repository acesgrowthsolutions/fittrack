import { headers } from "next/headers";
import { and, eq, gt, or, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeLifetimeStats } from "@/lib/lifetime-stats";
import { dailyStats, meals, workouts } from "@/lib/schema";

/**
 * Lifetime activity tracker: how many distinct days, weeks, months, and
 * years the user has logged anything (workout, recorded activity in
 * daily_stats, or a meal).
 *
 * Three SELECTs in parallel, each scoped to its own table. Returns only
 * the distinct date column to keep the payload small even for users with
 * thousands of rows. The aggregation work happens in computeLifetimeStats.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const [workoutDates, statDates, mealDates] = await Promise.all([
      db
        .selectDistinct({ d: workouts.workoutDate })
        .from(workouts)
        .where(eq(workouts.userId, userId)),

      // Only days with actual measurable activity count — an auto-created
      // daily_stats row with all zeros isn't engagement.
      db
        .selectDistinct({ d: dailyStats.date })
        .from(dailyStats)
        .where(
          and(
            eq(dailyStats.userId, userId),
            or(
              gt(dailyStats.steps, 0),
              gt(dailyStats.activeMinutes, 0),
              gt(dailyStats.caloriesBurned, 0),
              gt(sql<number>`CAST(${dailyStats.distanceKm} AS NUMERIC)`, 0)
            )
          )
        ),

      db.selectDistinct({ d: meals.mealDate }).from(meals).where(eq(meals.userId, userId)),
    ]);

    const allDates = [
      ...workoutDates.map((r) => r.d),
      ...statDates.map((r) => r.d),
      ...mealDates.map((r) => r.d),
    ];

    return Response.json(computeLifetimeStats(allDates));
  } catch (error) {
    console.error("Error fetching lifetime stats:", error);
    return Response.json({ error: "Failed to fetch lifetime stats" }, { status: 500 });
  }
}
