import { addDays } from "@/lib/date-tz";

/**
 * Compute the user's current consecutive-day workout streak.
 *
 * Lenient at the front edge: if `todayStr` has no workout yet but the day
 * before does, the streak still counts — so logging an evening workout
 * doesn't reset things mid-day.
 *
 * `dateSet` should contain workout dates as YYYY-MM-DD strings in the same
 * timezone as `todayStr` (typically the user's local tz).
 * `maxDays` caps the walk and protects against runaway loops on bad data.
 */
export function calculateWorkoutStreak(
  dateSet: Set<string>,
  todayStr: string,
  maxDays = 365
): number {
  let cursor = todayStr;

  if (!dateSet.has(cursor)) {
    cursor = addDays(cursor, -1);
    if (!dateSet.has(cursor)) return 0;
  }

  let streak = 0;
  for (let i = 0; i < maxDays; i += 1) {
    if (!dateSet.has(cursor)) break;
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
