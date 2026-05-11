import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { goals } from "@/lib/schema";

type Params = { params: Promise<{ id: string }> };

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PUT(req: Request, { params }: Params) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!uuidRegex.test(id)) {
      return Response.json({ error: "Invalid goal ID" }, { status: 400 });
    }

    const body = await req.json();
    const { currentValue, completed, targetValue, endDate } = body;

    // Build update set, always include updatedAt to guarantee non-empty set
    const updateSet: Record<string, unknown> = { updatedAt: new Date() };
    if (currentValue != null) updateSet.currentValue = currentValue.toString();
    if (completed != null) updateSet.completed = completed;
    if (targetValue != null) updateSet.targetValue = targetValue.toString();
    if (endDate !== undefined) updateSet.endDate = endDate;

    const [updated] = await db
      .update(goals)
      .set(updateSet)
      .where(and(eq(goals.id, id), eq(goals.userId, session.user.id)))
      .returning();

    if (!updated) {
      return Response.json({ error: "Goal not found" }, { status: 404 });
    }

    return Response.json(updated);
  } catch (error) {
    console.error("Error updating goal:", error);
    return Response.json({ error: "Failed to update goal" }, { status: 500 });
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
      return Response.json({ error: "Invalid goal ID" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, session.user.id)))
      .returning();

    if (!deleted) {
      return Response.json({ error: "Goal not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting goal:", error);
    return Response.json({ error: "Failed to delete goal" }, { status: 500 });
  }
}
