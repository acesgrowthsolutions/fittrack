import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { checkAchievements } from "@/lib/achievements";
import { auth } from "@/lib/auth";
import { todayInTz } from "@/lib/date-tz";
import { db } from "@/lib/db";
import { dailyStats } from "@/lib/schema";
import { getUserTz } from "@/lib/user-tz";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = todayInTz(await getUserTz());

    const [stats] = await db
      .select()
      .from(dailyStats)
      .where(
        and(eq(dailyStats.userId, session.user.id), eq(dailyStats.date, today))
      )
      .limit(1);

    if (!stats) {
      // Return default stats for today
      return Response.json({
        date: today,
        steps: 0,
        distanceKm: "0",
        caloriesBurned: 0,
        activeMinutes: 0,
      });
    }

    return Response.json(stats);
  } catch (error) {
    console.error("Error fetching today's stats:", error);
    return Response.json(
      { error: "Failed to fetch today's stats" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { steps, distanceKm, caloriesBurned, activeMinutes } = body;

    if (steps == null && distanceKm == null && caloriesBurned == null && activeMinutes == null) {
      return Response.json({ error: "At least one field is required" }, { status: 400 });
    }

    const today = todayInTz(await getUserTz());

    // Build the update set, always include updatedAt to guarantee non-empty set
    const updateSet: Record<string, unknown> = { updatedAt: new Date() };
    if (steps != null) updateSet.steps = steps;
    if (distanceKm != null) updateSet.distanceKm = distanceKm.toString();
    if (caloriesBurned != null) updateSet.caloriesBurned = caloriesBurned;
    if (activeMinutes != null) updateSet.activeMinutes = activeMinutes;

    // Upsert using ON CONFLICT on the unique (userId, date) index
    const [result] = await db
      .insert(dailyStats)
      .values({
        userId: session.user.id,
        date: today,
        steps: steps ?? 0,
        distanceKm: distanceKm?.toString() ?? "0",
        caloriesBurned: caloriesBurned ?? 0,
        activeMinutes: activeMinutes ?? 0,
      })
      .onConflictDoUpdate({
        target: [dailyStats.userId, dailyStats.date],
        set: updateSet,
      })
      .returning();

    checkAchievements(session.user.id).catch((err) =>
      console.error("Achievement check failed:", err)
    );

    return Response.json(result);
  } catch (error) {
    console.error("Error saving today's stats:", error);
    return Response.json(
      { error: "Failed to save today's stats" },
      { status: 500 }
    );
  }
}
