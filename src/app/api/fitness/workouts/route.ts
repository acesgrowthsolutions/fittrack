import { headers } from "next/headers";
import { eq, and, desc } from "drizzle-orm";
import { checkAchievements } from "@/lib/achievements";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workouts } from "@/lib/schema";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20") || 20, 100);
    const offset = parseInt(searchParams.get("offset") || "0") || 0;
    const type = searchParams.get("type") as typeof workouts.type.enumValues[number] | null;

    // Build WHERE clause: always filter by userId, optionally by type
    const whereClause = type
      ? and(eq(workouts.userId, session.user.id), eq(workouts.type, type))
      : eq(workouts.userId, session.user.id);

    const results = await db
      .select()
      .from(workouts)
      .where(whereClause)
      .orderBy(desc(workouts.workoutDate), desc(workouts.createdAt))
      .limit(limit)
      .offset(offset);

    return Response.json(results);
  } catch (error) {
    console.error("Error fetching workouts:", error);
    return Response.json(
      { error: "Failed to fetch workouts" },
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
    const { type, name, durationMinutes, caloriesBurned, distanceKm, notes, workoutDate } = body;

    if (!type || !name || !durationMinutes || caloriesBurned == null || !workoutDate) {
      return Response.json(
        { error: "Missing required fields: type, name, durationMinutes, caloriesBurned, workoutDate" },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(workouts)
      .values({
        userId: session.user.id,
        type,
        name,
        durationMinutes,
        caloriesBurned,
        distanceKm: distanceKm?.toString() ?? null,
        notes: notes ?? null,
        workoutDate,
      })
      .returning();

    checkAchievements(session.user.id).catch((err) =>
      console.error("Achievement check failed:", err)
    );

    return Response.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating workout:", error);
    return Response.json(
      { error: "Failed to create workout" },
      { status: 500 }
    );
  }
}
