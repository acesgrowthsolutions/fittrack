function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0] as string;
}

/**
 * Compute the user's current consecutive-day workout streak.
 *
 * Lenient at the front edge: if today has no workout yet but yesterday does,
 * the streak still counts — so logging an evening workout doesn't reset things
 * mid-day.
 *
 * `dateSet` should contain workout dates as YYYY-MM-DD strings.
 * `now` defaults to the current time; tests override it for determinism.
 * `maxDays` caps the walk and protects against runaway loops on bad data.
 */
export function calculateWorkoutStreak(
  dateSet: Set<string>,
  now: Date = new Date(),
  maxDays = 365
): number {
  const cursor = new Date(now);

  if (!dateSet.has(toDateStr(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!dateSet.has(toDateStr(cursor))) {
      return 0;
    }
  }

  let streak = 0;
  for (let i = 0; i < maxDays; i += 1) {
    if (!dateSet.has(toDateStr(cursor))) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
