import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { checkAchievements } from "@/lib/achievements";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workouts } from "@/lib/schema";
import { parseJsonBody, workoutUpdateSchema } from "@/lib/validators/fitness";

type Params = { params: Promise<{ id: string }> };

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, { params }: Params) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!uuidRegex.test(id)) {
      return Response.json({ error: "Invalid workout ID" }, { status: 400 });
    }

    const [workout] = await db
      .select()
      .from(workouts)
      .where(and(eq(workouts.id, id), eq(workouts.userId, session.user.id)))
      .limit(1);

    if (!workout) {
      return Response.json({ error: "Workout not found" }, { status: 404 });
    }

    return Response.json(workout);
  } catch (error) {
    console.error("Error fetching workout:", error);
    return Response.json({ error: "Failed to fetch workout" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!uuidRegex.test(id)) {
      return Response.json({ error: "Invalid workout ID" }, { status: 400 });
    }

    const body = await parseJsonBody(req, workoutUpdateSchema);
    if (!body.ok) return body.response;
    const { type, name, durationMinutes, caloriesBurned, distanceKm, notes, workoutDate } =
      body.data;

    // Build update set, always include updatedAt to guarantee non-empty set
    const updateSet: Record<string, unknown> = { updatedAt: new Date() };
    if (type !== undefined) updateSet.type = type;
    if (name !== undefined) updateSet.name = name;
    if (durationMinutes !== undefined) updateSet.durationMinutes = durationMinutes;
    if (caloriesBurned !== undefined) updateSet.caloriesBurned = caloriesBurned;
    if (distanceKm !== undefined)
      updateSet.distanceKm = distanceKm != null ? distanceKm.toString() : null;
    if (notes !== undefined) updateSet.notes = notes;
    if (workoutDate !== undefined) updateSet.workoutDate = workoutDate;

    const [updated] = await db
      .update(workouts)
      .set(updateSet)
      .where(and(eq(workouts.id, id), eq(workouts.userId, session.user.id)))
      .returning();

    if (!updated) {
      return Response.json({ error: "Workout not found" }, { status: 404 });
    }

    // Editing duration/calories/distance can newly qualify the user for a
    // badge (long_session, calorie_crusher, five_k_club, etc.) that the
    // original insert didn't. Awaited so we can include newly-earned badges
    // in the response for an immediate client toast; errors are non-fatal.
    const newBadges = await checkAchievements(session.user.id).catch((err) => {
      console.error("Achievement check after workout edit failed:", err);
      return [];
    });

    return Response.json({ ...updated, newBadges });
  } catch (error) {
    console.error("Error updating workout:", error);
    return Response.json({ error: "Failed to update workout" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!uuidRegex.test(id)) {
      return Response.json({ error: "Invalid workout ID" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(workouts)
      .where(and(eq(workouts.id, id), eq(workouts.userId, session.user.id)))
      .returning();

    if (!deleted) {
      return Response.json({ error: "Workout not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting workout:", error);
    return Response.json({ error: "Failed to delete workout" }, { status: 500 });
  }
}
