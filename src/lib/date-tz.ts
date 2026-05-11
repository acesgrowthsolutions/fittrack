/**
 * Timezone-aware YYYY-MM-DD helpers.
 *
 * The app stores fitness rows (workouts, daily_stats, meals) keyed by a
 * `date` column representing the user's *local* day. Server-side date math
 * must therefore happen in the user's timezone, not UTC. Use `getUserTz()`
 * (server) or `getLocalTz()` (client) to obtain a tz, then pass it here.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function isValidIanaTz(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Format an absolute moment (Date) as YYYY-MM-DD in the given IANA tz. */
export function formatDateInTz(d: Date, tz: string): string {
  // en-CA gives ISO-style "YYYY-MM-DD" output, which avoids locale-specific
  // delimiters/orderings.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${day}`;
}

/** Today's date (YYYY-MM-DD) in the given tz. */
export function todayInTz(tz: string, now: Date = new Date()): string {
  return formatDateInTz(now, tz);
}

function parseDate(dateStr: string): { y: number; m: number; d: number } {
  if (!DATE_RE.test(dateStr)) {
    throw new RangeError(`Invalid date string: ${dateStr}`);
  }
  const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
  return { y, m, d };
}

/**
 * Add (or subtract) calendar days to a YYYY-MM-DD string. Pure string math —
 * uses Date.UTC internally so DST has no effect.
 */
export function addDays(dateStr: string, delta: number): string {
  const { y, m, d } = parseDate(dateStr);
  const ms = Date.UTC(y, m - 1, d) + delta * 86_400_000;
  const out = new Date(ms);
  return `${out.getUTCFullYear()}-${pad(out.getUTCMonth() + 1)}-${pad(out.getUTCDate())}`;
}

/**
 * Monday of the ISO week containing dateStr (Mon-start, Sun = day 7).
 */
export function mondayOf(dateStr: string): string {
  const { y, m, d } = parseDate(dateStr);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay(); // 0..6, 0 = Sunday
  const offset = day === 0 ? 6 : day - 1;
  return addDays(dateStr, -offset);
}

/** First day of dateStr's month (YYYY-MM-01). */
export function startOfMonth(dateStr: string): string {
  const { y, m } = parseDate(dateStr);
  return `${y}-${pad(m)}-01`;
}

/** First day of dateStr's year (YYYY-01-01). */
export function startOfYear(dateStr: string): string {
  const { y } = parseDate(dateStr);
  return `${y}-01-01`;
}

/**
 * Whole calendar days from `fromStr` to `toStr` (signed: positive when `to`
 * is later). Both arguments are YYYY-MM-DD calendar dates in the same tz, so
 * the result is unaffected by DST or wall-clock hours. Used for things like
 * "days remaining" countdowns, where mixing a date column with `Date.now()`
 * would let UTC midnight skew the answer relative to the user's local day.
 */
export function daysBetween(fromStr: string, toStr: string): number {
  const a = parseDate(fromStr);
  const b = parseDate(toStr);
  const fromMs = Date.UTC(a.y, a.m - 1, a.d);
  const toMs = Date.UTC(b.y, b.m - 1, b.d);
  return Math.round((toMs - fromMs) / 86_400_000);
}
