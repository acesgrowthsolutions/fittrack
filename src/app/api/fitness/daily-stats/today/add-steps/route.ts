import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { checkAchievements } from "@/lib/achievements";
import { auth } from "@/lib/auth";
import { todayInTz } from "@/lib/date-tz";
import { db } from "@/lib/db";
import { dailyStats } from "@/lib/schema";
import { getUserTz } from "@/lib/user-tz";

const bodySchema = z.object({
  steps: z.number().int().min(0).max(100_000),
  distanceKm: z.number().min(0).max(500).optional(),
  caloriesBurned: z.number().int().min(0).max(20_000).optional(),
  activeMinutes: z.number().int().min(0).max(1440).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid body", details: z.flattenError(parsed.error).fieldErrors },
        { status: 400 }
      );
    }

    const { steps, distanceKm, caloriesBurned, activeMinutes } = parsed.data;

    if (
      steps === 0 &&
      !distanceKm &&
      !caloriesBurned &&
      !activeMinutes
    ) {
      return Response.json({ error: "Nothing to add" }, { status: 400 });
    }

    const today = todayInTz(await getUserTz());

    // Atomic upsert: insert new row with deltas, or add deltas to existing row.
    // Using SQL increments avoids the read-modify-write race when the user has
    // multiple tabs / devices counting at once.
    const [result] = await db
      .insert(dailyStats)
      .values({
        userId: session.user.id,
        date: today,
        steps,
        distanceKm: (distanceKm ?? 0).toString(),
        caloriesBurned: caloriesBurned ?? 0,
        activeMinutes: activeMinutes ?? 0,
      })
      .onConflictDoUpdate({
        target: [dailyStats.userId, dailyStats.date],
        set: {
          steps: sql`${dailyStats.steps} + ${steps}`,
          distanceKm: sql`${dailyStats.distanceKm} + ${(distanceKm ?? 0).toString()}`,
          caloriesBurned: sql`${dailyStats.caloriesBurned} + ${caloriesBurned ?? 0}`,
          activeMinutes: sql`${dailyStats.activeMinutes} + ${activeMinutes ?? 0}`,
          updatedAt: new Date(),
        },
      })
      .returning();

    checkAchievements(session.user.id).catch((err) =>
      console.error("Achievement check failed:", err)
    );

    return Response.json(result);
  } catch (error) {
    console.error("Error adding steps:", error);
    return Response.json({ error: "Failed to add steps" }, { status: 500 });
  }
}
