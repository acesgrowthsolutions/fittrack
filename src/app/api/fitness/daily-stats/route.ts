import { headers } from "next/headers";
import { eq, and, gte, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dailyStats } from "@/lib/schema";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const days = Math.min(parseInt(searchParams.get("days") || "30") || 30, 365);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split("T")[0] as string;

    const results = await db
      .select()
      .from(dailyStats)
      .where(
        and(
          eq(dailyStats.userId, session.user.id),
          gte(dailyStats.date, startDateStr)
        )
      )
      .orderBy(desc(dailyStats.date));

    return Response.json(results);
  } catch (error) {
    console.error("Error fetching daily stats:", error);
    return Response.json(
      { error: "Failed to fetch daily stats" },
      { status: 500 }
    );
  }
}
