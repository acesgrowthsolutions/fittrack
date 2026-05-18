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

describe("early_bird (tz-aware)", () => {
  // Measures log-time (createdAt) evaluated in the user's tz, not UTC.
  // "Before 7 AM" means the user's local 7 AM. Pass userTz as the 4th
  // qualifies() arg; falls back to UTC when omitted.

  it("fires when a workout is logged at 06:00 in the user's tz", () => {
    // 06:00 America/Los_Angeles = 13:00 UTC. UTC-only check would miss it.
    const w = [mkWorkout({ createdAt: new Date("2026-04-15T13:00:00Z") })];
    expect(qualifies("early_bird", w, [], "America/Los_Angeles")).toBe(true);
  });

  it("does not fire at 07:00 local (boundary exclusive)", () => {
    // 07:00 America/Los_Angeles = 14:00 UTC.
    const w = [mkWorkout({ createdAt: new Date("2026-04-15T14:00:00Z") })];
    expect(qualifies("early_bird", w, [], "America/Los_Angeles")).toBe(false);
  });

  it("uses the user's tz, not UTC", () => {
    // 06:00 Asia/Tokyo = 21:00 UTC the previous day. UTC-only check would
    // call this evening and miss; tz-aware sees morning and awards.
    const w = [mkWorkout({ createdAt: new Date("2026-04-15T21:00:00Z") })];
    expect(qualifies("early_bird", w, [], "Asia/Tokyo")).toBe(true);
    expect(qualifies("early_bird", w, [], "UTC")).toBe(false);
  });

  it("defaults to UTC when tz argument is omitted", () => {
    const w = [mkWorkout({ createdAt: new Date("2026-04-15T05:00:00Z") })];
    expect(qualifies("early_bird", w, [])).toBe(true);
  });

  it("returns false when no workout sits before 7 AM in any input", () => {
    const w = [mkWorkout({ createdAt: new Date("2026-04-15T15:00:00Z") })];
    expect(qualifies("early_bird", w, [], "America/Los_Angeles")).toBe(false);
  });
});

describe("workout-count badges", () => {
  it("getting_started fires at 5 workouts and not before", () => {
    const four = Array.from({ length: 4 }, () => mkWorkout());
    const five = Array.from({ length: 5 }, () => mkWorkout());
    expect(qualifies("getting_started", four, [])).toBe(false);
    expect(qualifies("getting_started", five, [])).toBe(true);
  });

  it("half_century fires at 50 workouts and not before", () => {
    const fortyNine = Array.from({ length: 49 }, () => mkWorkout());
    const fifty = Array.from({ length: 50 }, () => mkWorkout());
    expect(qualifies("half_century", fortyNine, [])).toBe(false);
    expect(qualifies("half_century", fifty, [])).toBe(true);
  });
});

describe("distance badges are running-only", () => {
  it("five_k_club requires a single 5+km RUN", () => {
    expect(qualifies("five_k_club", [mkWorkout({ type: "cycling", distanceKm: "50" })], [])).toBe(
      false
    );
    expect(qualifies("five_k_club", [mkWorkout({ type: "running", distanceKm: "4.9" })], [])).toBe(
      false
    );
    expect(qualifies("five_k_club", [mkWorkout({ type: "running", distanceKm: "5" })], [])).toBe(
      true
    );
  });

  it("ten_k_club requires a single 10+km RUN", () => {
    expect(qualifies("ten_k_club", [mkWorkout({ type: "running", distanceKm: "9.99" })], [])).toBe(
      false
    );
    expect(qualifies("ten_k_club", [mkWorkout({ type: "running", distanceKm: "10" })], [])).toBe(
      true
    );
  });

  it("trailblazer sums only running distance, not cycling", () => {
    // 95km running + 50km cycling = 145km but only 95km counts → no badge
    const w = [
      mkWorkout({ type: "running", distanceKm: "50" }),
      mkWorkout({ type: "running", distanceKm: "45" }),
      mkWorkout({ type: "cycling", distanceKm: "50" }),
    ];
    expect(qualifies("trailblazer", w, [])).toBe(false);
    // Add 5km more running → 100km total running, fires
    w.push(mkWorkout({ type: "running", distanceKm: "5" }));
    expect(qualifies("trailblazer", w, [])).toBe(true);
  });

  it("half_marathon now requires running distance (tightened from earlier behavior)", () => {
    // Pure cycling no longer qualifies — previously it incorrectly did.
    expect(
      qualifies("half_marathon", [mkWorkout({ type: "cycling", distanceKm: "100" })], [])
    ).toBe(false);
    expect(
      qualifies("half_marathon", [mkWorkout({ type: "running", distanceKm: "21.1" })], [])
    ).toBe(true);
  });
});

describe("step_master", () => {
  it("fires at 20k steps in a single day", () => {
    expect(qualifies("step_master", [], [mkStat({ steps: 19999 })])).toBe(false);
    expect(qualifies("step_master", [], [mkStat({ steps: 20000 })])).toBe(true);
  });
});

describe("long_session", () => {
  it("fires at 90+ minutes in a single workout", () => {
    expect(qualifies("long_session", [mkWorkout({ durationMinutes: 89 })], [])).toBe(false);
    expect(qualifies("long_session", [mkWorkout({ durationMinutes: 90 })], [])).toBe(true);
  });
});

describe("calorie_crusher", () => {
  it("fires at 1000+ calories burned in a single workout", () => {
    expect(qualifies("calorie_crusher", [mkWorkout({ caloriesBurned: 999 })], [])).toBe(false);
    expect(qualifies("calorie_crusher", [mkWorkout({ caloriesBurned: 1000 })], [])).toBe(true);
  });
});

describe("well_rounded", () => {
  it("fires when 3 different types appear within any 7-day window", () => {
    const w = [
      mkWorkout({ type: "running", workoutDate: "2026-04-10" }),
      mkWorkout({ type: "cycling", workoutDate: "2026-04-12" }),
      mkWorkout({ type: "yoga", workoutDate: "2026-04-15" }),
    ];
    expect(qualifies("well_rounded", w, [])).toBe(true);
  });

  it("does not fire when 3 types are spread across more than 7 days", () => {
    const w = [
      mkWorkout({ type: "running", workoutDate: "2026-04-01" }),
      mkWorkout({ type: "cycling", workoutDate: "2026-04-10" }),
      mkWorkout({ type: "yoga", workoutDate: "2026-04-20" }),
    ];
    expect(qualifies("well_rounded", w, [])).toBe(false);
  });

  it("does not fire when only 2 distinct types are logged", () => {
    const w = Array.from({ length: 6 }, (_, i) =>
      mkWorkout({
        type: i % 2 === 0 ? "running" : "cycling",
        workoutDate: `2026-04-${String(10 + i).padStart(2, "0")}`,
      })
    );
    expect(qualifies("well_rounded", w, [])).toBe(false);
  });
});

describe("two_week_wonder", () => {
  it("fires at 14 consecutive workout days", () => {
    const w = Array.from({ length: 14 }, (_, i) =>
      mkWorkout({ workoutDate: `2026-04-${String(10 + i).padStart(2, "0")}` })
    );
    expect(qualifies("two_week_wonder", w, [])).toBe(true);
  });

  it("does not fire on a 13-day run", () => {
    const w = Array.from({ length: 13 }, (_, i) =>
      mkWorkout({ workoutDate: `2026-04-${String(10 + i).padStart(2, "0")}` })
    );
    expect(qualifies("two_week_wonder", w, [])).toBe(false);
  });

  it("breaks the streak at a gap", () => {
    // Days 10-15 (6), gap on 16, days 17-23 (7) — longest is 7, not 14
    const dates = ["10", "11", "12", "13", "14", "15", "17", "18", "19", "20", "21", "22", "23"];
    const w = dates.map((d) => mkWorkout({ workoutDate: `2026-04-${d.padStart(2, "0")}` }));
    expect(qualifies("two_week_wonder", w, [])).toBe(false);
  });

  it("multiple workouts on the same day count as one", () => {
    // 14 workouts but only 7 distinct days → no badge
    const w: ReturnType<typeof mkWorkout>[] = [];
    for (let i = 0; i < 7; i++) {
      w.push(mkWorkout({ workoutDate: `2026-04-${String(10 + i).padStart(2, "0")}` }));
      w.push(mkWorkout({ workoutDate: `2026-04-${String(10 + i).padStart(2, "0")}` }));
    }
    expect(qualifies("two_week_wonder", w, [])).toBe(false);
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

describe("night_owl (hidden, tz-aware)", () => {
  // Window is [22:00, 04:00) evaluated in the caller's tz. Tests that omit
  // a tz exercise the default-UTC path; one test below pins a non-UTC zone
  // to lock in the tz-aware behavior.
  it("fires when a workout is logged at 22:00 UTC (boundary inclusive)", () => {
    const w = [mkWorkout({ createdAt: new Date("2026-04-15T22:00:00Z") })];
    expect(qualifies("night_owl", w, [])).toBe(true);
  });

  it("fires when a workout is logged at 02:00 UTC", () => {
    const w = [mkWorkout({ createdAt: new Date("2026-04-15T02:30:00Z") })];
    expect(qualifies("night_owl", w, [])).toBe(true);
  });

  it("does not fire at 21:59 UTC (one minute before the window opens)", () => {
    const w = [mkWorkout({ createdAt: new Date("2026-04-15T21:59:00Z") })];
    expect(qualifies("night_owl", w, [])).toBe(false);
  });

  it("does not fire at 04:00 UTC (boundary exclusive)", () => {
    const w = [mkWorkout({ createdAt: new Date("2026-04-15T04:00:00Z") })];
    expect(qualifies("night_owl", w, [])).toBe(false);
  });

  it("does not fire mid-day", () => {
    const w = [mkWorkout({ createdAt: new Date("2026-04-15T12:00:00Z") })];
    expect(qualifies("night_owl", w, [])).toBe(false);
  });

  it("evaluates the night window in the caller's tz, not UTC", () => {
    // 13:00 UTC is 22:00 Asia/Tokyo (next-day local) — qualifies in Tokyo,
    // not in UTC (where it's the middle of the afternoon).
    const w = [mkWorkout({ createdAt: new Date("2026-04-15T13:00:00Z") })];
    expect(qualifies("night_owl", w, [], "Asia/Tokyo")).toBe(true);
    expect(qualifies("night_owl", w, [], "UTC")).toBe(false);
  });
});

describe("comeback_kid (hidden)", () => {
  it("does not fire with a single workout", () => {
    expect(qualifies("comeback_kid", [mkWorkout()], [])).toBe(false);
  });

  it("fires when two workouts are exactly 30 days apart", () => {
    const w = [mkWorkout({ workoutDate: "2026-04-01" }), mkWorkout({ workoutDate: "2026-05-01" })];
    expect(qualifies("comeback_kid", w, [])).toBe(true);
  });

  it("does not fire on a 29-day gap", () => {
    const w = [mkWorkout({ workoutDate: "2026-04-01" }), mkWorkout({ workoutDate: "2026-04-30" })];
    expect(qualifies("comeback_kid", w, [])).toBe(false);
  });

  it("fires when a long gap appears anywhere in the history", () => {
    // dense activity for a week, 35-day break, then return
    const dates = ["10", "11", "12", "13", "14", "15", "16"];
    const w = dates.map((d) => mkWorkout({ workoutDate: `2026-04-${d.padStart(2, "0")}` }));
    w.push(mkWorkout({ workoutDate: "2026-05-21" }));
    expect(qualifies("comeback_kid", w, [])).toBe(true);
  });

  it("collapses duplicate workouts on the same day", () => {
    // Two workouts on the same day shouldn't satisfy the 2-date minimum.
    const w = [mkWorkout({ workoutDate: "2026-04-15" }), mkWorkout({ workoutDate: "2026-04-15" })];
    expect(qualifies("comeback_kid", w, [])).toBe(false);
  });
});

describe("triathlete (hidden)", () => {
  it("fires when running + cycling + swimming all on the same date", () => {
    const w = [
      mkWorkout({ type: "running", workoutDate: "2026-04-15" }),
      mkWorkout({ type: "cycling", workoutDate: "2026-04-15" }),
      mkWorkout({ type: "swimming", workoutDate: "2026-04-15" }),
    ];
    expect(qualifies("triathlete", w, [])).toBe(true);
  });

  it("does not fire when one discipline is missing on the day", () => {
    const w = [
      mkWorkout({ type: "running", workoutDate: "2026-04-15" }),
      mkWorkout({ type: "cycling", workoutDate: "2026-04-15" }),
    ];
    expect(qualifies("triathlete", w, [])).toBe(false);
  });

  it("does not fire when the three disciplines are spread across different days", () => {
    const w = [
      mkWorkout({ type: "running", workoutDate: "2026-04-15" }),
      mkWorkout({ type: "cycling", workoutDate: "2026-04-16" }),
      mkWorkout({ type: "swimming", workoutDate: "2026-04-17" }),
    ];
    expect(qualifies("triathlete", w, [])).toBe(false);
  });

  it("fires if any single day has all three, even if other days are partial", () => {
    const w = [
      mkWorkout({ type: "running", workoutDate: "2026-04-10" }),
      mkWorkout({ type: "running", workoutDate: "2026-04-15" }),
      mkWorkout({ type: "cycling", workoutDate: "2026-04-15" }),
      mkWorkout({ type: "swimming", workoutDate: "2026-04-15" }),
    ];
    expect(qualifies("triathlete", w, [])).toBe(true);
  });
});

describe("weekend_warrior (hidden)", () => {
  // In 2026, Saturdays are Apr 4, Apr 11, Apr 18, Apr 25.
  function satSun(sat: string, sun: string) {
    return [mkWorkout({ workoutDate: sat }), mkWorkout({ workoutDate: sun })];
  }

  it("fires on 4 consecutive Sat+Sun pairs", () => {
    const w = [
      ...satSun("2026-04-04", "2026-04-05"),
      ...satSun("2026-04-11", "2026-04-12"),
      ...satSun("2026-04-18", "2026-04-19"),
      ...satSun("2026-04-25", "2026-04-26"),
    ];
    expect(qualifies("weekend_warrior", w, [])).toBe(true);
  });

  it("does not fire on 3 consecutive Sat+Sun pairs", () => {
    const w = [
      ...satSun("2026-04-04", "2026-04-05"),
      ...satSun("2026-04-11", "2026-04-12"),
      ...satSun("2026-04-18", "2026-04-19"),
    ];
    expect(qualifies("weekend_warrior", w, [])).toBe(false);
  });

  it("does not fire when a Sunday is missing from a pair", () => {
    const w = [
      ...satSun("2026-04-04", "2026-04-05"),
      ...satSun("2026-04-11", "2026-04-12"),
      mkWorkout({ workoutDate: "2026-04-18" }), // Sat only
      ...satSun("2026-04-25", "2026-04-26"),
    ];
    // 4 Saturdays exist, but Apr 18 has no Sunday → streak breaks after Apr 12,
    // restarts at Apr 25 with streak 1 → never reaches 4.
    expect(qualifies("weekend_warrior", w, [])).toBe(false);
  });

  it("does not fire when there's a gap between weekend pairs", () => {
    const w = [
      ...satSun("2026-04-04", "2026-04-05"),
      ...satSun("2026-04-11", "2026-04-12"),
      // skip 2026-04-18/19
      ...satSun("2026-04-25", "2026-04-26"),
      ...satSun("2026-05-02", "2026-05-03"),
    ];
    expect(qualifies("weekend_warrior", w, [])).toBe(false);
  });

  it("ignores mid-week workouts", () => {
    const w = [
      ...satSun("2026-04-04", "2026-04-05"),
      mkWorkout({ workoutDate: "2026-04-08" }), // Wednesday, no effect
      ...satSun("2026-04-11", "2026-04-12"),
      ...satSun("2026-04-18", "2026-04-19"),
      ...satSun("2026-04-25", "2026-04-26"),
    ];
    expect(qualifies("weekend_warrior", w, [])).toBe(true);
  });
});
