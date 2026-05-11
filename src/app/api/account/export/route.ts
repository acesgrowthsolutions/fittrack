import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { achievements, dailyStats, goals, meals, user, userProfile, workouts } from "@/lib/schema";

/**
 * GDPR Article 20 (data portability): return a JSON dump of everything the
 * signed-in user has stored in this app. Deliberately omits operational and
 * security-sensitive tables (sessions, accounts/credentials, verification
 * tokens, rate-limit events) — those aren't user-generated content and
 * exposing them would harm rather than help.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [userRow, profileRows, workoutRows, dailyStatRows, goalRows, mealRows, achievementRows] =
    await Promise.all([
      db.select().from(user).where(eq(user.id, userId)).limit(1),
      db.select().from(userProfile).where(eq(userProfile.userId, userId)),
      db.select().from(workouts).where(eq(workouts.userId, userId)),
      db.select().from(dailyStats).where(eq(dailyStats.userId, userId)),
      db.select().from(goals).where(eq(goals.userId, userId)),
      db.select().from(meals).where(eq(meals.userId, userId)),
      db.select().from(achievements).where(eq(achievements.userId, userId)),
    ]);

  const me = userRow[0];
  const payload = {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    user: me
      ? {
          id: me.id,
          name: me.name,
          email: me.email,
          emailVerified: me.emailVerified,
          image: me.image,
          createdAt: me.createdAt,
          updatedAt: me.updatedAt,
        }
      : null,
    profile: profileRows[0] ?? null,
    workouts: workoutRows,
    dailyStats: dailyStatRows,
    goals: goalRows,
    meals: mealRows,
    achievements: achievementRows,
  };

  // Force a download in the browser rather than letting the browser try to
  // render the (potentially large) JSON inline.
  const filename = `fittrack-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
