import { headers } from "next/headers";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { meals } from "@/lib/schema";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    const whereClause = date
      ? /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? and(eq(meals.userId, session.user.id), eq(meals.mealDate, date))
        : null
      : eq(meals.userId, session.user.id);

    if (whereClause === null) {
      return Response.json({ error: "Invalid date (expected YYYY-MM-DD)" }, { status: 400 });
    }

    const limit = Math.min(parseInt(searchParams.get("limit") || "50") || 50, 200);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0") || 0, 0);

    const results = await db
      .select()
      .from(meals)
      .where(whereClause)
      .orderBy(desc(meals.mealDate), desc(meals.createdAt))
      .limit(limit)
      .offset(offset);

    return Response.json(results);
  } catch (error) {
    console.error("Error fetching meals:", error);
    return Response.json({ error: "Failed to fetch meals" }, { status: 500 });
  }
}
