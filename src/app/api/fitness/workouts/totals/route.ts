import { headers } from "next/headers";
import { and, eq, gte, lte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import {
  addDays,
  mondayOf,
  startOfMonth,
  startOfYear,
  todayInTz,
} from "@/lib/date-tz";
import { db } from "@/lib/db";
import { workouts } from "@/lib/schema";
import { getUserTz } from "@/lib/user-tz";
import { calculateWorkoutStreak } from "@/lib/workout-streak";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const tz = await getUserTz();
    const today = todayInTz(tz);
    const weekStart = mondayOf(today);
    const monthStart = startOfMonth(today);
    const yearStart = startOfYear(today);
    // Pull a year+ of history so streaks crossing the calendar-year boundary
    // remain accurate.
    const earliestStart = addDays(today, -366);

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

    const streak = calculateWorkoutStreak(dateSet, today);

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
