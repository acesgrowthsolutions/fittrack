import { BADGE_DEFINITIONS, type BadgeType } from "./badge-definitions";
import type { dailyStats as dailyStatsTable, workouts as workoutsTable } from "./schema";

/**
 * Mirrors the qualifying logic in src/lib/achievements.ts:qualifies() but
 * returns a numeric progress measurement instead of a boolean. Used by the
 * /achievements page to render progress bars on un-earned badges.
 *
 * Pure functions over the same workouts + daily_stats inputs qualifies()
 * uses — no DB or React imports — so the same data set serves both the
 * award decision and the progress display in a single request.
 *
 * A handful of badges (speed_demon, early_bird) don't reduce to a useful
 * numeric ratio. Those return { kind: "no-tracker" } with a short reason
 * the UI shows in place of a progress bar.
 */

type Workout = typeof workoutsTable.$inferSelect;
type DailyStat = typeof dailyStatsTable.$inferSelect;

export type BadgeProgress =
  | { kind: "numeric"; current: number; target: number; unit: string }
  | { kind: "no-tracker"; reason: string };

const DAY_MS = 24 * 60 * 60 * 1000;

function roundToTenth(n: number): number {
  return Math.round(n * 10) / 10;
}

function bestConsecutiveDays(dates: string[]): number {
  const sorted = Array.from(new Set(dates)).sort();
  if (sorted.length === 0) return 0;
  let best = 1;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] as string).getTime();
    const curr = new Date(sorted[i] as string).getTime();
    const diffDays = Math.round((curr - prev) / DAY_MS);
    streak = diffDays === 1 ? streak + 1 : 1;
    if (streak > best) best = streak;
  }
  return best;
}

// Largest count of workouts that fall within any 7-calendar-day window.
// Matches iron_week's `span <= 6 days` formulation.
function maxWorkoutsInSevenDayWindow(w: Workout[]): number {
  if (w.length === 0) return 0;
  const days = w.map((x) => new Date(x.workoutDate).getTime()).sort((a, b) => a - b);
  const WINDOW = 6 * DAY_MS;
  let left = 0;
  let best = 1;
  for (let right = 0; right < days.length; right++) {
    while ((days[right] as number) - (days[left] as number) > WINDOW) left++;
    const count = right - left + 1;
    if (count > best) best = count;
  }
  return best;
}

// Largest count of distinct workout types within any 7-calendar-day window.
// Matches well_rounded's `dayMs - startMs >= WEEK_MS` formulation.
function maxDistinctTypesInSevenDayWindow(w: Workout[]): number {
  if (w.length === 0) return 0;
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
  const WINDOW = 7 * DAY_MS;
  let best = 0;
  for (let i = 0; i < sortedDates.length; i++) {
    const windowTypes = new Set<string>();
    const startMs = new Date(sortedDates[i] as string).getTime();
    for (let j = i; j < sortedDates.length; j++) {
      const dayMs = new Date(sortedDates[j] as string).getTime();
      if (dayMs - startMs >= WINDOW) break;
      for (const t of dayTypes.get(sortedDates[j] as string) ?? []) windowTypes.add(t);
    }
    if (windowTypes.size > best) best = windowTypes.size;
  }
  return best;
}

function maxRunningDistance(w: Workout[]): number {
  return w
    .filter((x) => x.type === "running")
    .reduce((m, x) => Math.max(m, x.distanceKm ? parseFloat(x.distanceKm) : 0), 0);
}

function totalRunningDistance(w: Workout[]): number {
  return w
    .filter((x) => x.type === "running")
    .reduce((sum, x) => sum + (x.distanceKm ? parseFloat(x.distanceKm) : 0), 0);
}

function maxSteps(s: DailyStat[]): number {
  return s.reduce((m, d) => Math.max(m, d.steps), 0);
}

export function computeBadgeProgress(type: BadgeType, w: Workout[], s: DailyStat[]): BadgeProgress {
  switch (type) {
    case "first_workout":
      return { kind: "numeric", current: w.length, target: 1, unit: "workouts" };
    case "getting_started":
      return { kind: "numeric", current: w.length, target: 5, unit: "workouts" };
    case "half_century":
      return { kind: "numeric", current: w.length, target: 50, unit: "workouts" };
    case "century_club":
      return { kind: "numeric", current: w.length, target: 100, unit: "workouts" };

    case "10k_steps":
      return { kind: "numeric", current: maxSteps(s), target: 10000, unit: "steps" };
    case "step_master":
      return { kind: "numeric", current: maxSteps(s), target: 20000, unit: "steps" };

    case "long_session": {
      const best = w.reduce((m, x) => Math.max(m, x.durationMinutes ?? 0), 0);
      return { kind: "numeric", current: best, target: 90, unit: "min" };
    }
    case "calorie_crusher": {
      const best = w.reduce((m, x) => Math.max(m, x.caloriesBurned ?? 0), 0);
      return { kind: "numeric", current: best, target: 1000, unit: "kcal" };
    }

    case "five_k_club":
      return {
        kind: "numeric",
        current: roundToTenth(maxRunningDistance(w)),
        target: 5,
        unit: "km",
      };
    case "ten_k_club":
      return {
        kind: "numeric",
        current: roundToTenth(maxRunningDistance(w)),
        target: 10,
        unit: "km",
      };

    case "half_marathon":
      return {
        kind: "numeric",
        current: roundToTenth(totalRunningDistance(w)),
        target: 21.1,
        unit: "km",
      };
    case "marathon":
      return {
        kind: "numeric",
        current: roundToTenth(totalRunningDistance(w)),
        target: 42.2,
        unit: "km",
      };
    case "trailblazer":
      return {
        kind: "numeric",
        current: roundToTenth(totalRunningDistance(w)),
        target: 100,
        unit: "km",
      };

    case "week_warrior": {
      const active = s
        .filter((d) => d.steps > 0 || d.activeMinutes > 0 || d.caloriesBurned > 0)
        .map((d) => d.date);
      return {
        kind: "numeric",
        current: bestConsecutiveDays(active),
        target: 7,
        unit: "days",
      };
    }
    case "two_week_wonder":
      return {
        kind: "numeric",
        current: bestConsecutiveDays(w.map((x) => x.workoutDate)),
        target: 14,
        unit: "days",
      };

    case "iron_week":
      return {
        kind: "numeric",
        current: maxWorkoutsInSevenDayWindow(w),
        target: 7,
        unit: "workouts",
      };
    case "well_rounded":
      return {
        kind: "numeric",
        current: maxDistinctTypesInSevenDayWindow(w),
        target: 3,
        unit: "types",
      };

    case "speed_demon":
      return { kind: "no-tracker", reason: "Run under 5 min/km" };
    case "early_bird":
      return { kind: "no-tracker", reason: "Coming soon" };

    // Hidden badges: progress is stripped from the API response before it
    // ever reaches the client, but we still need entries here so
    // computeAllProgress() covers every BadgeType (the exhaustiveness
    // guard below returns "" otherwise, which is harmless but noisy).
    case "night_owl":
    case "weekend_warrior":
    case "comeback_kid":
    case "triathlete":
      return { kind: "no-tracker", reason: "" };

    default:
      // Exhaustiveness guard: every badge in BADGE_DEFINITIONS must map.
      return { kind: "no-tracker", reason: "" };
  }
}

export function computeAllProgress(w: Workout[], s: DailyStat[]): Record<BadgeType, BadgeProgress> {
  const out = {} as Record<BadgeType, BadgeProgress>;
  for (const b of BADGE_DEFINITIONS) {
    out[b.type] = computeBadgeProgress(b.type, w, s);
  }
  return out;
}
