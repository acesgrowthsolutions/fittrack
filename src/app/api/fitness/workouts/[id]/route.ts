import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workouts } from "@/lib/schema";

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
    return Response.json(
      { error: "Failed to fetch workout" },
      { status: 500 }
    );
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

    const body = await req.json();
    const { type, name, durationMinutes, caloriesBurned, distanceKm, notes, workoutDate } = body;

    // Build update set, always include updatedAt to guarantee non-empty set
    const updateSet: Record<string, unknown> = { updatedAt: new Date() };
    if (type) updateSet.type = type;
    if (name) updateSet.name = name;
    if (durationMinutes != null) updateSet.durationMinutes = durationMinutes;
    if (caloriesBurned != null) updateSet.caloriesBurned = caloriesBurned;
    if (distanceKm !== undefined) updateSet.distanceKm = distanceKm?.toString() ?? null;
    if (notes !== undefined) updateSet.notes = notes;
    if (workoutDate) updateSet.workoutDate = workoutDate;

    const [updated] = await db
      .update(workouts)
      .set(updateSet)
      .where(and(eq(workouts.id, id), eq(workouts.userId, session.user.id)))
      .returning();

    if (!updated) {
      return Response.json({ error: "Workout not found" }, { status: 404 });
    }

    return Response.json(updated);
  } catch (error) {
    console.error("Error updating workout:", error);
    return Response.json(
      { error: "Failed to update workout" },
      { status: 500 }
    );
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
    return Response.json(
      { error: "Failed to delete workout" },
      { status: 500 }
    );
  }
}
