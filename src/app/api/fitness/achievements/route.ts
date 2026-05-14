import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { checkAchievements } from "@/lib/achievements";
import { auth } from "@/lib/auth";
import { BADGE_DEFINITIONS } from "@/lib/badge-definitions";
import { computeAllProgress } from "@/lib/badge-progress";
import { db } from "@/lib/db";
import { achievements, dailyStats, workouts } from "@/lib/schema";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Lazy backfill: award any badges the user newly qualifies for before we
    // read. Catches users who already met the criteria for a badge before
    // that badge existed in BADGE_DEFINITIONS (e.g. the 10 added in a later
    // release) — without this, those users would never see them awarded
    // because checkAchievements otherwise only runs after a mutating event
    // (workout/steps log). Safe on every visit: the unique index +
    // onConflictDoNothing inside checkAchievements make it idempotent.
    await checkAchievements(userId).catch((err) => {
      console.error("Lazy checkAchievements failed for", userId, err);
    });

    // Pull earned achievements plus the raw inputs needed to compute progress
    // toward un-earned ones, all in parallel. Same set checkAchievements()
    // already reads, so no extra round-trip vs the previous behavior.
    const [earned, userWorkouts, userStats] = await Promise.all([
      db
        .select()
        .from(achievements)
        .where(eq(achievements.userId, userId))
        .orderBy(desc(achievements.earnedAt)),
      db.select().from(workouts).where(eq(workouts.userId, userId)),
      db.select().from(dailyStats).where(eq(dailyStats.userId, userId)),
    ]);

    const progress = computeAllProgress(userWorkouts, userStats);

    // Don't leak hidden-badge criteria — strip their progress before the
    // response leaves the server. The client never sees current/target for
    // a hidden badge it hasn't earned, so users can't reverse-engineer
    // unlock conditions from the network tab.
    for (const def of BADGE_DEFINITIONS) {
      if (def.hidden) delete progress[def.type];
    }

    return Response.json({ earned, progress });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    return Response.json({ error: "Failed to fetch achievements" }, { status: 500 });
  }
}
