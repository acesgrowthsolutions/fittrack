import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { goals } from "@/lib/schema";
import { goalCreateSchema, parseJsonBody } from "@/lib/validators/fitness";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = await db
      .select()
      .from(goals)
      .where(eq(goals.userId, session.user.id))
      .orderBy(desc(goals.createdAt));

    return Response.json(results);
  } catch (error) {
    console.error("Error fetching goals:", error);
    return Response.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await parseJsonBody(req, goalCreateSchema);
    if (!body.ok) return body.response;
    const { type, targetValue, unit, startDate, endDate } = body.data;

    const [created] = await db
      .insert(goals)
      .values({
        userId: session.user.id,
        type,
        targetValue: targetValue.toString(),
        unit,
        startDate,
        endDate: endDate ?? null,
      })
      .returning();

    return Response.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating goal:", error);
    return Response.json({ error: "Failed to create goal" }, { status: 500 });
  }
}
