import { eq } from "drizzle-orm";
import { BADGE_DEFINITIONS, type BadgeType } from "./badge-definitions";
import { db } from "./db";
import { achievements, dailyStats, workouts } from "./schema";

export { BADGE_DEFINITIONS };
export type { BadgeType };

type Workout = typeof workouts.$inferSelect;
type DailyStat = typeof dailyStats.$inferSelect;

// Extract the local-clock hour (0-23) of an absolute moment in a given IANA
// tz. Used by time-of-day badges (early_bird, night_owl) so "before 7 AM"
// means *the user's* 7 AM, not Vercel's UTC 7 AM.
function hourInTz(d: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  // en-US can emit "24" for midnight under some locales — normalise to 0.
  return Number.isFinite(h) ? h % 24 : 0;
}

export function qualifies(
  type: BadgeType,
  w: Workout[],
  s: DailyStat[],
  userTz: string = "UTC"
): boolean {
  switch (type) {
    case "first_workout":
      return w.length >= 1;
    case "getting_started":
      return w.length >= 5;
    case "half_century":
      return w.length >= 50;
    case "century_club":
      return w.length >= 100;
    case "10k_steps":
      return s.some((d) => d.steps >= 10000);
    case "step_master":
      return s.some((d) => d.steps >= 20000);
    case "long_session":
      return w.some((x) => x.durationMinutes >= 90);
    case "calorie_crusher":
      return w.some((x) => x.caloriesBurned >= 1000);
    case "five_k_club":
      return w.some(
        (x) => x.type === "running" && x.distanceKm != null && parseFloat(x.distanceKm) >= 5
      );
    case "ten_k_club":
      return w.some(
        (x) => x.type === "running" && x.distanceKm != null && parseFloat(x.distanceKm) >= 10
      );
    case "half_marathon": {
      const total = w
        .filter((x) => x.type === "running")
        .reduce((sum, x) => sum + (x.distanceKm ? parseFloat(x.distanceKm) : 0), 0);
      return total >= 21.1;
    }
    case "marathon": {
      const total = w
        .filter((x) => x.type === "running")
        .reduce((sum, x) => sum + (x.distanceKm ? parseFloat(x.distanceKm) : 0), 0);
      return total >= 42.2;
    }
    case "trailblazer": {
      const total = w
        .filter((x) => x.type === "running")
        .reduce((sum, x) => sum + (x.distanceKm ? parseFloat(x.distanceKm) : 0), 0);
      return total >= 100;
    }
    case "speed_demon":
      // Pace badge only applies to running — a cycling session at 30 km/h
      // would trivially clear a "5 min/km" threshold otherwise.
      return w.some((x) => {
        if (x.type !== "running") return false;
        const dist = x.distanceKm ? parseFloat(x.distanceKm) : 0;
        return dist > 0 && x.durationMinutes / dist < 5;
      });
    case "early_bird":
      // We measure log-time, not start-of-activity (the workouts table
      // doesn't carry the latter). That matches the badge description
      // ("Log a workout before 7 AM") literally. `userTz` is the caller's
      // current IANA tz — without it we'd default to UTC and silently
      // misfire for anyone east or west of Greenwich.
      return w.some((x) => hourInTz(new Date(x.createdAt), userTz) < 7);
    case "iron_week": {
      // 7 workouts within any 7-day calendar window
      const days = w.map((x) => new Date(x.workoutDate).getTime());
      days.sort((a, b) => a - b);
      const WEEK = 6 * 24 * 60 * 60 * 1000;
      let left = 0;
      for (let right = 0; right < days.length; right++) {
        while ((days[right] as number) - (days[left] as number) > WEEK) left++;
        if (right - left + 1 >= 7) return true;
      }
      return false;
    }
    case "week_warrior": {
      // 7 consecutive daily_stats entries (any activity counts as a logged day)
      const dates = Array.from(
        new Set(
          s
            .filter((d) => d.steps > 0 || d.activeMinutes > 0 || d.caloriesBurned > 0)
            .map((d) => d.date)
        )
      ).sort();
      let streak = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1] as string).getTime();
        const curr = new Date(dates[i] as string).getTime();
        const diffDays = Math.round((curr - prev) / (24 * 60 * 60 * 1000));
        streak = diffDays === 1 ? streak + 1 : 1;
        if (streak >= 7) return true;
      }
      return false;
    }
    case "two_week_wonder": {
      // 14 consecutive calendar days with at least one workout
      const dates = Array.from(new Set(w.map((x) => x.workoutDate))).sort();
      let streak = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1] as string).getTime();
        const curr = new Date(dates[i] as string).getTime();
        const diffDays = Math.round((curr - prev) / (24 * 60 * 60 * 1000));
        streak = diffDays === 1 ? streak + 1 : 1;
        if (streak >= 14) return true;
      }
      return false;
    }
    case "night_owl": {
      // Measures log-time (the workouts table has no start-of-activity
      // timestamp) — matches the badge surprise factor either way. Uses
      // the user's tz so "between 10 PM and 4 AM" means their local night,
      // not Vercel's UTC night.
      return w.some((x) => {
        const h = hourInTz(new Date(x.createdAt), userTz);
        return h >= 22 || h < 4;
      });
    }
    case "comeback_kid": {
      // 30+ day gap between any two consecutive unique workout dates.
      const dates = Array.from(new Set(w.map((x) => x.workoutDate))).sort();
      if (dates.length < 2) return false;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1] as string).getTime();
        const curr = new Date(dates[i] as string).getTime();
        if ((curr - prev) / (24 * 60 * 60 * 1000) >= 30) return true;
      }
      return false;
    }
    case "triathlete": {
      // Running + cycling + swimming all on the same calendar date.
      const byDate = new Map<string, Set<string>>();
      for (const x of w) {
        let types = byDate.get(x.workoutDate);
        if (!types) {
          types = new Set();
          byDate.set(x.workoutDate, types);
        }
        types.add(x.type);
      }
      for (const types of byDate.values()) {
        if (types.has("running") && types.has("cycling") && types.has("swimming")) return true;
      }
      return false;
    }
    case "weekend_warrior": {
      // 4 consecutive weekends with workouts on BOTH Sat and Sun. Workout
      // dates are YYYY-MM-DD strings, so parsing as UTC keeps day-of-week
      // arithmetic stable across the runner's local timezone.
      const dateSet = new Set(w.map((x) => x.workoutDate));
      const validSatMs: number[] = [];
      for (const d of dateSet) {
        const t = new Date((d as string) + "T00:00:00Z").getTime();
        if (new Date(t).getUTCDay() !== 6) continue; // Saturday only
        const sun = new Date(t + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        if (dateSet.has(sun)) validSatMs.push(t);
      }
      validSatMs.sort((a, b) => a - b);
      const WEEK = 7 * 24 * 60 * 60 * 1000;
      let streak = 1;
      for (let i = 1; i < validSatMs.length; i++) {
        const weeksApart = ((validSatMs[i] as number) - (validSatMs[i - 1] as number)) / WEEK;
        streak = weeksApart === 1 ? streak + 1 : 1;
        if (streak >= 4) return true;
      }
      return false;
    }
    case "well_rounded": {
      // 3+ distinct workout types within any 7-calendar-day window.
      // Group workouts by date, then slide a 7-day window over the sorted
      // unique-date timeline and count distinct types inside it.
      const dayTypes = new Map<string, Set<string>>();
      for (const x of w) {
        let set = dayTypes.get(x.workoutDate);
        if (!set) {
          set = new Set();
          dayTypes.set(x.workoutDate, set);
        }
        set.add(x.type);
      }
      const sortedDates = [...dayTypes.keys()].sort();
      const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
      for (let i = 0; i < sortedDates.length; i++) {
        const windowTypes = new Set<string>();
        const startMs = new Date(sortedDates[i] as string).getTime();
        for (let j = i; j < sortedDates.length; j++) {
          const dayMs = new Date(sortedDates[j] as string).getTime();
          if (dayMs - startMs >= WEEK_MS) break;
          for (const t of dayTypes.get(sortedDates[j] as string) ?? []) windowTypes.add(t);
          if (windowTypes.size >= 3) return true;
        }
      }
      return false;
    }
    default:
      // Unknown badge type — adding a new BADGE_DEFINITIONS entry without a
      // matching case will silently never award. Returning false here makes
      // the omission visible (no award) instead of returning undefined.
      return false;
  }
}

/**
 * Evaluate all badge rules for a user and insert any newly-earned achievements.
 * Returns the list of badge types awarded this call. Safe to call after any
 * mutation that could affect progress (workouts, daily stats).
 *
 * `userTz` should be the caller's current IANA tz (from getUserTz() on a
 * cookie-bearing request). Without it we default to UTC, which is fine for
 * tz-insensitive badges (counts, distances, step thresholds) but will skew
 * time-of-day ones (early_bird, night_owl) for non-UTC users. Callers
 * without a request context (e.g. the Terra webhook) can omit it — those
 * paths only trigger step badges, which don't care about hour.
 */
export async function checkAchievements(
  userId: string,
  userTz: string = "UTC"
): Promise<BadgeType[]> {
  const existing = await db
    .select({ badgeType: achievements.badgeType })
    .from(achievements)
    .where(eq(achievements.userId, userId));
  const earned = new Set(existing.map((e) => e.badgeType));

  const pending = BADGE_DEFINITIONS.filter((b) => !earned.has(b.type));
  if (pending.length === 0) return [];

  const [userWorkouts, userStats] = await Promise.all([
    db.select().from(workouts).where(eq(workouts.userId, userId)),
    db.select().from(dailyStats).where(eq(dailyStats.userId, userId)),
  ]);

  const toAward = pending.filter((b) => qualifies(b.type, userWorkouts, userStats, userTz));
  if (toAward.length === 0) return [];

  // onConflictDoNothing pairs with the unique (user_id, badge_type) index to
  // make concurrent checkAchievements() calls idempotent — without it, two
  // racing mutations could each pass the existence check and double-insert.
  const inserted = await db
    .insert(achievements)
    .values(
      toAward.map((b) => ({
        userId,
        badgeType: b.type,
        badgeName: b.name,
        description: b.description,
      }))
    )
    .onConflictDoNothing({ target: [achievements.userId, achievements.badgeType] })
    .returning({ badgeType: achievements.badgeType });

  return inserted.map((row) => row.badgeType as BadgeType);
}
