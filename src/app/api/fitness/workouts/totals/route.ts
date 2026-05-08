import { headers } from "next/headers";
import { and, eq, gte, lte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workouts } from "@/lib/schema";

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

    const earliestStart = yearStart;

    const rows = await db
      .select({ workoutDate: workouts.workoutDate })
      .from(workouts)
      .where(
        and(
          eq(workouts.userId, userId),
          gte(workouts.workoutDate, earliestStart),
          lte(workouts.workoutDate, today)
        )
      );

    let day = 0;
    let week = 0;
    let month = 0;
    const year = rows.length;

    for (const row of rows) {
      if (row.workoutDate >= monthStart) month += 1;
      if (row.workoutDate >= weekStart) week += 1;
      if (row.workoutDate === today) day += 1;
    }

    return Response.json({ day, week, month, year });
  } catch (error) {
    console.error("Error fetching workout totals:", error);
    return Response.json(
      { error: "Failed to fetch workout totals" },
      { status: 500 }
    );
  }
}
