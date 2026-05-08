import { headers } from "next/headers";
import { and, eq, gte, lte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workouts } from "@/lib/schema";
import { calculateWorkoutStreak } from "@/lib/workout-streak";

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0] as string;
}

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const now = new Date();
    const today = toDateStr(now);

    // Monday of the current week (ISO week, Monday-start)
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(monday.getDate() - mondayOffset);
    const weekStart = toDateStr(monday);

    const monthStart = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
    const yearStart = toDateStr(new Date(now.getFullYear(), 0, 1));

    // Pull a year+ of history so streaks crossing the calendar-year boundary
    // remain accurate.
    const streakWindow = new Date(now);
    streakWindow.setDate(streakWindow.getDate() - 366);
    const earliestStart = toDateStr(streakWindow);

    const rows = await db
      .select({
        workoutDate: workouts.workoutDate,
        durationMinutes: workouts.durationMinutes,
      })
      .from(workouts)
      .where(
        and(
          eq(workouts.userId, userId),
          gte(workouts.workoutDate, earliestStart),
          lte(workouts.workoutDate, today)
        )
      );

    let dayCount = 0;
    let weekCount = 0;
    let monthCount = 0;
    let yearCount = 0;
    let dayMinutes = 0;
    let weekMinutes = 0;
    let monthMinutes = 0;
    let yearMinutes = 0;
    const dateSet = new Set<string>();

    for (const row of rows) {
      const mins = row.durationMinutes ?? 0;
      dateSet.add(row.workoutDate);
      if (row.workoutDate >= yearStart) {
        yearCount += 1;
        yearMinutes += mins;
      }
      if (row.workoutDate >= monthStart) {
        monthCount += 1;
        monthMinutes += mins;
      }
      if (row.workoutDate >= weekStart) {
        weekCount += 1;
        weekMinutes += mins;
      }
      if (row.workoutDate === today) {
        dayCount += 1;
        dayMinutes += mins;
      }
    }

    const streak = calculateWorkoutStreak(dateSet, now);

    return Response.json({
      streak,
      day: { count: dayCount, minutes: dayMinutes },
      week: { count: weekCount, minutes: weekMinutes },
      month: { count: monthCount, minutes: monthMinutes },
      year: { count: yearCount, minutes: yearMinutes },
    });
  } catch (error) {
    console.error("Error fetching workout totals:", error);
    return Response.json(
      { error: "Failed to fetch workout totals" },
      { status: 500 }
    );
  }
}
