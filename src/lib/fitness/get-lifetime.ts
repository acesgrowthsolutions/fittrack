import { and, eq, gt, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { computeLifetimeStats, type LifetimeStats } from "@/lib/lifetime-stats";
import { dailyStats, meals, workouts } from "@/lib/schema";

/**
 * Lifetime activity tracker data: how many distinct days/weeks/months/years
 * the user has logged anything. Extracted from /api/fitness/lifetime so the
 * dashboard Server Component can call it directly without an HTTP self-fetch.
 *
 * Returns a JSON-serializable shape.
 */
export async function getLifetimeStats(userId: string): Promise<LifetimeStats> {
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

  return computeLifetimeStats(allDates);
}
