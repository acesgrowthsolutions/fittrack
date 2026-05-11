import { eq } from "drizzle-orm";
import { db } from "./db";
import { achievements, dailyStats, workouts } from "./schema";

export const BADGE_DEFINITIONS = [
  {
    type: "first_workout",
    name: "First Workout",
    description: "Complete your first workout",
  },
  {
    type: "week_warrior",
    name: "Week Warrior",
    description: "Log activity for 7 consecutive days",
  },
  {
    type: "10k_steps",
    name: "10K Steps",
    description: "Reach 10,000 steps in a single day",
  },
  {
    type: "half_marathon",
    name: "Half Marathon",
    description: "Run a cumulative half marathon (21.1 km)",
  },
  {
    type: "marathon",
    name: "Marathon",
    description: "Run a cumulative marathon (42.2 km)",
  },
  {
    type: "century_club",
    name: "Century Club",
    description: "Complete 100 workouts",
  },
  {
    type: "iron_week",
    name: "Iron Week",
    description: "Complete 7 workouts in a single week",
  },
  {
    type: "speed_demon",
    name: "Speed Demon",
    description: "Complete a workout with a pace under 5 min/km",
  },
  {
    type: "early_bird",
    name: "Early Bird",
    description: "Log a workout before 7 AM",
  },
] as const;

type BadgeType = (typeof BADGE_DEFINITIONS)[number]["type"];
type Workout = typeof workouts.$inferSelect;
type DailyStat = typeof dailyStats.$inferSelect;

export function qualifies(type: BadgeType, w: Workout[], s: DailyStat[]): boolean {
  switch (type) {
    case "first_workout":
      return w.length >= 1;
    case "century_club":
      return w.length >= 100;
    case "10k_steps":
      return s.some((d) => d.steps >= 10000);
    case "half_marathon": {
      const total = w.reduce((sum, x) => sum + (x.distanceKm ? parseFloat(x.distanceKm) : 0), 0);
      return total >= 21.1;
    }
    case "marathon": {
      const total = w.reduce((sum, x) => sum + (x.distanceKm ? parseFloat(x.distanceKm) : 0), 0);
      return total >= 42.2;
    }
    case "speed_demon":
      return w.some((x) => {
        const dist = x.distanceKm ? parseFloat(x.distanceKm) : 0;
        return dist > 0 && x.durationMinutes / dist < 5;
      });
    case "early_bird":
      return w.some((x) => new Date(x.createdAt).getHours() < 7);
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
  }
}

/**
 * Evaluate all badge rules for a user and insert any newly-earned achievements.
 * Returns the list of badge types awarded this call. Safe to call after any
 * mutation that could affect progress (workouts, daily stats).
 */
export async function checkAchievements(userId: string): Promise<BadgeType[]> {
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

  const toAward = pending.filter((b) => qualifies(b.type, userWorkouts, userStats));
  if (toAward.length === 0) return [];

  await db.insert(achievements).values(
    toAward.map((b) => ({
      userId,
      badgeType: b.type,
      badgeName: b.name,
      description: b.description,
    }))
  );

  return toAward.map((b) => b.type);
}
