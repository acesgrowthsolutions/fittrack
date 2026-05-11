import { describe, it, expect, vi } from "vitest";
import { qualifies } from "@/lib/achievements";
import type { workouts, dailyStats } from "@/lib/schema";

// Stub db module — qualifies() is pure but achievements.ts imports ./db at top-level.
// vi.mock is hoisted by vitest, so this runs before the @/lib/achievements import.
vi.mock("@/lib/db", () => ({ db: {} }));

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

describe("qualifies() default case", () => {
  it("returns false for unknown BadgeType (default branch, not undefined)", () => {
    const result = qualifies("brand_new_badge" as never, [mkWorkout()], [mkStat()]);
    expect(result).toBe(false);
  });
});

describe("BUG H5: iron_week uses 6-day window (WEEK = 6 * DAY)", () => {
  it("7 workouts spanning exactly 7 calendar days (0..6) QUALIFIES", () => {
    const w = Array.from({ length: 7 }, (_, i) =>
      mkWorkout({ workoutDate: `2026-04-${String(10 + i).padStart(2, "0")}` })
    );
    expect(qualifies("iron_week", w, [])).toBe(true);
  });

  it("7 workouts spanning 8 calendar days (day 0..7) does NOT qualify — window is 6d", () => {
    // 7 workouts on days 10, 11, 12, 13, 14, 15, 17 — gap of 7 days between first & last
    const dates = ["10", "11", "12", "13", "14", "15", "17"];
    const w = dates.map((d) => mkWorkout({ workoutDate: `2026-04-${d.padStart(2, "0")}` }));
    // With a 6*DAY window, the span 10→17 is 7 days, exceeds, so fails
    expect(qualifies("iron_week", w, [])).toBe(false);
  });
});

describe("speed_demon is running-only", () => {
  it("does NOT award speed_demon to a CYCLING workout, even at sub-5min/km pace", () => {
    const w = [
      mkWorkout({
        type: "cycling",
        durationMinutes: 30,
        distanceKm: "50", // 0.6 min/km — absurdly fast for running, normal for cycling
      }),
    ];
    expect(qualifies("speed_demon", w, [])).toBe(false);
  });

  it("awards speed_demon to a RUNNING workout under 5 min/km", () => {
    const w = [
      mkWorkout({
        type: "running",
        durationMinutes: 20,
        distanceKm: "5", // 4 min/km
      }),
    ];
    expect(qualifies("speed_demon", w, [])).toBe(true);
  });

  it("does NOT award speed_demon to a slow running workout", () => {
    const w = [
      mkWorkout({
        type: "running",
        durationMinutes: 30,
        distanceKm: "5", // 6 min/km
      }),
    ];
    expect(qualifies("speed_demon", w, [])).toBe(false);
  });
});

describe("early_bird is deferred", () => {
  // The workouts schema has no start-of-activity timestamp, only workoutDate
  // (a date) and createdAt (insertion time, server-local). The badge cannot
  // be implemented correctly until a startedAt column is added. Until then,
  // qualifies() returns false for all inputs.
  it("does not award early_bird regardless of input", () => {
    const w = [
      mkWorkout({ workoutDate: "2026-04-15", createdAt: new Date("2026-04-15T05:00:00") }),
    ];
    expect(qualifies("early_bird", w, [])).toBe(false);
  });
});

describe("week_warrior correctness", () => {
  it("requires 7 consecutive days with activity", () => {
    const s = Array.from({ length: 7 }, (_, i) =>
      mkStat({
        date: `2026-04-${String(10 + i).padStart(2, "0")}`,
        steps: 1000,
      })
    );
    expect(qualifies("week_warrior", s.map(() => mkWorkout()) as never, s)).toBe(true);
  });

  it("breaks streak on a missed day", () => {
    const dates = ["10", "11", "12", "14", "15", "16", "17"];
    const s = dates.map((d) => mkStat({ date: `2026-04-${d.padStart(2, "0")}`, steps: 1000 }));
    expect(qualifies("week_warrior", [], s)).toBe(false);
  });
});
