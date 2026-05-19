import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { checkAchievements } from "@/lib/achievements";
import { auth } from "@/lib/auth";
import { BADGE_DEFINITIONS } from "@/lib/badge-definitions";
import { computeAllProgress } from "@/lib/badge-progress";
import { db } from "@/lib/db";
import { achievements, dailyStats, workouts } from "@/lib/schema";
import { getUserTz } from "@/lib/user-tz";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Load earned achievements + the raw inputs needed for both the lazy
    // backfill below AND the per-badge progress bars. Previously the lazy
    // checkAchievements() call did its own internal workouts+stats scan,
    // and then this Promise.all repeated the same two queries — a full
    // double-scan of the user's history on every /achievements visit. By
    // loading once here and passing the rows into checkAchievements as
    // `preloaded`, we cut that page's DB cost roughly in half.
    const [earnedInitial, userWorkouts, userStats] = await Promise.all([
      db
        .select()
        .from(achievements)
        .where(eq(achievements.userId, userId))
        .orderBy(desc(achievements.earnedAt)),
      db.select().from(workouts).where(eq(workouts.userId, userId)),
      db.select().from(dailyStats).where(eq(dailyStats.userId, userId)),
    ]);

    // Lazy backfill: award any badges the user newly qualifies for before we
    // read. Catches users who already met the criteria for a badge before
    // that badge existed in BADGE_DEFINITIONS (e.g. the 10 added in a later
    // release) — without this, those users would never see them awarded
    // because checkAchievements otherwise only runs after a mutating event
    // (workout/steps log). Safe on every visit: the unique index +
    // onConflictDoNothing inside checkAchievements make it idempotent.
    const newBadges = await checkAchievements(userId, await getUserTz(), {
      workouts: userWorkouts,
      stats: userStats,
    }).catch((err) => {
      console.error("Lazy checkAchievements failed for", userId, err);
      return [] as Awaited<ReturnType<typeof checkAchievements>>;
    });

    // Re-query the achievements table whenever this user could have had a new
    // badge inserted — either by our own checkAchievements call (newBadges
    // non-empty) OR by a concurrent writer (Terra webhook or a second
    // /achievements tab) that won the race against our onConflictDoNothing
    // insert and made our `newBadges` come back empty even though a badge
    // did get awarded. The proxy for "concurrent insert was possible" is
    // "the user is not maxed out on badges yet" — once `earnedInitial`
    // covers BADGE_DEFINITIONS, there's nothing left to award and we can
    // safely serve the snapshot. For everyone else, pay one indexed select
    // to guarantee they don't see a stale list after a workout/Terra-sync
    // racing with the page load.
    const possiblyStale =
      newBadges.length > 0 || earnedInitial.length < BADGE_DEFINITIONS.length;
    const earned = possiblyStale
      ? await db
          .select()
          .from(achievements)
          .where(eq(achievements.userId, userId))
          .orderBy(desc(achievements.earnedAt))
      : earnedInitial;

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
