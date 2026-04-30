import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { achievements } from "@/lib/schema";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = await db
      .select()
      .from(achievements)
      .where(eq(achievements.userId, session.user.id))
      .orderBy(desc(achievements.earnedAt));

    return Response.json(results);
  } catch (error) {
    console.error("Error fetching achievements:", error);
    return Response.json(
      { error: "Failed to fetch achievements" },
      { status: 500 }
    );
  }
}
