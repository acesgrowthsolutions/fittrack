/**
 * Lifetime activity tracker: given the set of calendar days the user has
 * done *something* (logged a workout, recorded steps/activity, logged a
 * meal), report how many distinct days, ISO weeks, calendar months, and
 * calendar years those activities span.
 *
 * Bucket counting (not range counting): a user who's active Jan 1 and
 * Dec 31 is "active in 1 year" (2026), not "active for 365 days." The
 * UI pitch is "how many distinct time windows you've shown up in."
 *
 * Pure: takes YYYY-MM-DD strings, returns numbers. No tz needed because
 * the input dates are already in the user's local tz (the same way every
 * fitness table stores `date`).
 */

export interface LifetimeStats {
  /** Distinct calendar days with any activity. */
  days: number;
  /** Distinct ISO weeks containing an active day. */
  weeks: number;
  /** Distinct calendar months containing an active day. */
  months: number;
  /** Distinct calendar years containing an active day. */
  years: number;
  /** Earliest active day, YYYY-MM-DD, or null when no activity. */
  firstActiveDate: string | null;
  /** Latest active day, YYYY-MM-DD, or null when no activity. */
  lastActiveDate: string | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * ISO 8601 week string ("YYYY-Www"). Defines a week as Mon-Sun and
 * assigns the week to the year that contains the Thursday of that week.
 */
function isoWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
  const utc = new Date(Date.UTC(y, m - 1, d));
  // Shift to the Thursday of the same ISO week.
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export function computeLifetimeStats(activeDates: readonly string[]): LifetimeStats {
  const unique = new Set<string>();
  for (const d of activeDates) {
    if (DATE_RE.test(d)) unique.add(d);
  }

  if (unique.size === 0) {
    return {
      days: 0,
      weeks: 0,
      months: 0,
      years: 0,
      firstActiveDate: null,
      lastActiveDate: null,
    };
  }

  const weeks = new Set<string>();
  const months = new Set<string>();
  const years = new Set<string>();
  let first: string | null = null;
  let last: string | null = null;

  for (const d of unique) {
    weeks.add(isoWeek(d));
    months.add(d.slice(0, 7)); // "YYYY-MM"
    years.add(d.slice(0, 4)); // "YYYY"
    if (first === null || d < first) first = d;
    if (last === null || d > last) last = d;
  }

  return {
    days: unique.size,
    weeks: weeks.size,
    months: months.size,
    years: years.size,
    firstActiveDate: first,
    lastActiveDate: last,
  };
}
