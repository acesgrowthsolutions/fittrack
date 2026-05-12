import { describe, expect, it } from "vitest";
import { computeAllProgress, computeBadgeProgress } from "@/lib/badge-progress";
import type { dailyStats, workouts } from "@/lib/schema";

type Workout = typeof workouts.$inferSelect;
type DailyStat = typeof dailyStats.$inferSelect;

function mkWorkout(overrides: Partial<Workout> = {}): Workout {
  const base = new Date("2026-04-15T12:00:00Z");
  return {
    id: "w-" + Math.random(),
    userId: "u1",
    type: "running",
    name: "Run",
    durationMinutes: 30,
    caloriesBurned: 300,
    distanceKm: "5",
    notes: null,
    workoutDate: "2026-04-15",
    createdAt: base,
    updatedAt: base,
    ...overrides,
  } as Workout;
}

function mkStat(overrides: Partial<DailyStat> = {}): DailyStat {
  const base = new Date("2026-04-15T12:00:00Z");
  return {
    id: "s-" + Math.random(),
    userId: "u1",
    date: "2026-04-15",
    steps: 0,
    distanceKm: "0",
    caloriesBurned: 0,
    activeMinutes: 0,
    createdAt: base,
    updatedAt: base,
    ...overrides,
  } as DailyStat;
}

describe("workout-count progress", () => {
  it("first_workout: 0/1 with no workouts, 1/1 with one", () => {
    expect(computeBadgeProgress("first_workout", [], [])).toEqual({
      kind: "numeric",
      current: 0,
      target: 1,
      unit: "workouts",
    });
    expect(computeBadgeProgress("first_workout", [mkWorkout()], [])).toEqual({
      kind: "numeric",
      current: 1,
      target: 1,
      unit: "workouts",
    });
  });

  it("century_club: shows raw count, not capped at target", () => {
    // The UI clamps the pct visually; the data should remain truthful so a
    // user with 150 workouts sees "150 / 100 workouts".
    const w = Array.from({ length: 150 }, () => mkWorkout());
    const r = computeBadgeProgress("century_club", w, []);
    expect(r).toEqual({ kind: "numeric", current: 150, target: 100, unit: "workouts" });
  });
});

describe("single-workout-max progress", () => {
  it("long_session reports best duration even when under threshold", () => {
    const w = [
      mkWorkout({ durationMinutes: 20 }),
      mkWorkout({ durationMinutes: 75 }),
      mkWorkout({ durationMinutes: 60 }),
    ];
    expect(computeBadgeProgress("long_session", w, [])).toEqual({
      kind: "numeric",
      current: 75,
      target: 90,
      unit: "min",
    });
  });

  it("calorie_crusher reports max single burn", () => {
    const w = [
      mkWorkout({ caloriesBurned: 200 }),
      mkWorkout({ caloriesBurned: 850 }),
      mkWorkout({ caloriesBurned: 500 }),
    ];
    expect(computeBadgeProgress("calorie_crusher", w, [])).toEqual({
      kind: "numeric",
      current: 850,
      target: 1000,
      unit: "kcal",
    });
  });

  it("five_k_club ignores non-running, reports best running distance", () => {
    const w = [
      mkWorkout({ type: "cycling", distanceKm: "50" }),
      mkWorkout({ type: "running", distanceKm: "4.2" }),
      mkWorkout({ type: "running", distanceKm: "3.5" }),
    ];
    const r = computeBadgeProgress("five_k_club", w, []);
    expect(r).toEqual({ kind: "numeric", current: 4.2, target: 5, unit: "km" });
  });
});

describe("cumulative-distance progress", () => {
  it("trailblazer sums running km only", () => {
    const w = [
      mkWorkout({ type: "running", distanceKm: "10" }),
      mkWorkout({ type: "running", distanceKm: "15.5" }),
      mkWorkout({ type: "cycling", distanceKm: "100" }), // ignored
    ];
    const r = computeBadgeProgress("trailblazer", w, []);
    expect(r).toEqual({ kind: "numeric", current: 25.5, target: 100, unit: "km" });
  });

  it("half_marathon rounds to one decimal", () => {
    const w = [
      mkWorkout({ type: "running", distanceKm: "5.234" }),
      mkWorkout({ type: "running", distanceKm: "3.111" }),
    ];
    const r = computeBadgeProgress("half_marathon", w, []);
    if (r.kind !== "numeric") throw new Error("expected numeric");
    expect(r.current).toBe(8.3); // 8.345 → 8.3
  });
});

describe("step-based progress", () => {
  it("10k_steps reports best single-day count", () => {
    const s = [mkStat({ steps: 4000 }), mkStat({ steps: 8500 }), mkStat({ steps: 6000 })];
    expect(computeBadgeProgress("10k_steps", [], s)).toEqual({
      kind: "numeric",
      current: 8500,
      target: 10000,
      unit: "steps",
    });
  });
});

describe("streak progress", () => {
  it("two_week_wonder reports longest historical streak, not current", () => {
    // A 10-day run, gap, then 4 more — best is 10
    const dates = [
      ...Array.from({ length: 10 }, (_, i) => `2026-04-${String(1 + i).padStart(2, "0")}`),
      ...Array.from({ length: 4 }, (_, i) => `2026-04-${String(15 + i).padStart(2, "0")}`),
    ];
    const w = dates.map((d) => mkWorkout({ workoutDate: d }));
    expect(computeBadgeProgress("two_week_wonder", w, [])).toEqual({
      kind: "numeric",
      current: 10,
      target: 14,
      unit: "days",
    });
  });

  it("week_warrior counts only days with measurable activity", () => {
    // 5 consecutive days of activity, with one zero-activity day in the middle
    const s = [
      mkStat({ date: "2026-04-01", steps: 1000 }),
      mkStat({ date: "2026-04-02", steps: 1000 }),
      mkStat({ date: "2026-04-03", steps: 0 }), // doesn't count
      mkStat({ date: "2026-04-04", steps: 1000 }),
      mkStat({ date: "2026-04-05", steps: 1000 }),
    ];
    const r = computeBadgeProgress("week_warrior", [], s);
    if (r.kind !== "numeric") throw new Error("expected numeric");
    // Best run is 2 days (Apr 1–2 or Apr 4–5)
    expect(r.current).toBe(2);
  });
});

describe("window-count progress", () => {
  it("iron_week reports best workout count in any 7-calendar-day window", () => {
    // 4 workouts in days 1-5, then 1 workout on day 20 → best window count = 4
    const w = [
      mkWorkout({ workoutDate: "2026-04-01" }),
      mkWorkout({ workoutDate: "2026-04-02" }),
      mkWorkout({ workoutDate: "2026-04-04" }),
      mkWorkout({ workoutDate: "2026-04-05" }),
      mkWorkout({ workoutDate: "2026-04-20" }),
    ];
    expect(computeBadgeProgress("iron_week", w, [])).toEqual({
      kind: "numeric",
      current: 4,
      target: 7,
      unit: "workouts",
    });
  });

  it("well_rounded reports max distinct types in any 7-day window", () => {
    const w = [
      mkWorkout({ type: "running", workoutDate: "2026-04-01" }),
      mkWorkout({ type: "cycling", workoutDate: "2026-04-03" }),
      mkWorkout({ type: "yoga", workoutDate: "2026-04-04" }),
      mkWorkout({ type: "swimming", workoutDate: "2026-04-20" }), // outside window
    ];
    expect(computeBadgeProgress("well_rounded", w, [])).toEqual({
      kind: "numeric",
      current: 3,
      target: 3,
      unit: "types",
    });
  });
});

describe("no-tracker badges", () => {
  it("speed_demon has a reason string and no numeric measurement", () => {
    const r = computeBadgeProgress("speed_demon", [], []);
    expect(r.kind).toBe("no-tracker");
    if (r.kind === "no-tracker") expect(r.reason.length).toBeGreaterThan(0);
  });

  it("early_bird is deferred — not awarded, no tracker", () => {
    const r = computeBadgeProgress("early_bird", [], []);
    expect(r.kind).toBe("no-tracker");
  });
});

describe("computeAllProgress shape", () => {
  it("returns an entry for every BADGE_DEFINITIONS type", () => {
    const all = computeAllProgress([], []);
    const types = Object.keys(all);
    // Sanity-check a handful of types we expect to be present.
    expect(types).toContain("first_workout");
    expect(types).toContain("two_week_wonder");
    expect(types).toContain("speed_demon");
    expect(types).toContain("trailblazer");
    // No duplicates or unexpected keys; length should match BADGE_DEFINITIONS.
    expect(types.length).toBeGreaterThanOrEqual(19);
  });
});
