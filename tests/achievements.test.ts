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

describe("BUG C1: qualifies() lacks exhaustive default", () => {
  it("returns undefined when passed an unknown BadgeType (silent failure)", () => {
    // Simulate a newly-added badge type that forgot a case in the switch
    const result = qualifies("brand_new_badge" as never, [mkWorkout()], [mkStat()]);
    // BUG: returns undefined instead of false, and TS type says `boolean`
    expect(result).toBe(undefined);
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

describe("BUG M6: speed_demon triggers on non-running workouts", () => {
  it("awards speed_demon to a CYCLING workout at cycling pace (50 km in 30 min)", () => {
    // Cycling at 100 km/h is nonsensical, but any 5+km under 5 min/km triggers
    const w = [
      mkWorkout({
        type: "cycling",
        durationMinutes: 30,
        distanceKm: "50", // 0.6 min/km — absurdly fast for running
      }),
    ];
    // BUG: badge should be running-only but code checks all types
    expect(qualifies("speed_demon", w, [])).toBe(true);
  });
});

describe("BUG C1 (second): early_bird triggers off createdAt not workoutDate", () => {
  it("awards early_bird when a workout is LOGGED before 7am, regardless of when it happened", () => {
    // Workout performed at 9am, but logged (created) at 6:30 am next day
    const w = [
      mkWorkout({
        workoutDate: "2026-04-15",
        createdAt: new Date("2026-04-16T06:30:00"), // 6:30 am local
      }),
    ];
    // BUG: uses createdAt.getHours() < 7, not the workout's actual start time
    expect(qualifies("early_bird", w, [])).toBe(true);
  });

  it("does NOT award early_bird for a 5am workout logged at 10am", () => {
    const w = [
      mkWorkout({
        workoutDate: "2026-04-15",
        createdAt: new Date("2026-04-15T10:00:00"), // 10am local — too late
      }),
    ];
    // BUG: the user did a 5am run but the badge won't fire
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
