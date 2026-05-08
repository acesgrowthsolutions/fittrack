import { describe, it, expect } from "vitest";
import { calculateWorkoutStreak } from "@/lib/workout-streak";

// All tests anchor "now" at noon UTC so day-walking can't be confused by
// midnight or DST. The streak helper compares YYYY-MM-DD strings only.
const NOW = new Date("2026-05-08T12:00:00Z");
const TODAY = "2026-05-08";
const YESTERDAY = "2026-05-07";
const TWO_DAYS_AGO = "2026-05-06";
const THREE_DAYS_AGO = "2026-05-05";

describe("calculateWorkoutStreak", () => {
  it("returns 0 for an empty set", () => {
    expect(calculateWorkoutStreak(new Set(), NOW)).toBe(0);
  });

  it("returns 1 when only today has a workout", () => {
    expect(calculateWorkoutStreak(new Set([TODAY]), NOW)).toBe(1);
  });

  it("is lenient: returns 1 when only yesterday has a workout", () => {
    expect(calculateWorkoutStreak(new Set([YESTERDAY]), NOW)).toBe(1);
  });

  it("counts consecutive days ending today", () => {
    const set = new Set([TODAY, YESTERDAY, TWO_DAYS_AGO]);
    expect(calculateWorkoutStreak(set, NOW)).toBe(3);
  });

  it("counts consecutive days ending yesterday", () => {
    const set = new Set([YESTERDAY, TWO_DAYS_AGO, THREE_DAYS_AGO]);
    expect(calculateWorkoutStreak(set, NOW)).toBe(3);
  });

  it("breaks the streak at the first gap", () => {
    // today + day-before-yesterday, but no yesterday → just today counts
    const set = new Set([TODAY, TWO_DAYS_AGO]);
    expect(calculateWorkoutStreak(set, NOW)).toBe(1);
  });

  it("returns 0 when the most recent workout is two days ago", () => {
    const set = new Set([TWO_DAYS_AGO, THREE_DAYS_AGO]);
    expect(calculateWorkoutStreak(set, NOW)).toBe(0);
  });

  it("ignores far-past workouts when there is no recent activity", () => {
    expect(calculateWorkoutStreak(new Set(["2025-12-01"]), NOW)).toBe(0);
  });

  it("handles duplicate dates gracefully (Set already dedupes)", () => {
    const set = new Set([TODAY, TODAY, YESTERDAY]);
    expect(calculateWorkoutStreak(set, NOW)).toBe(2);
  });

  it("crosses month boundaries", () => {
    const now = new Date("2026-05-01T12:00:00Z");
    const set = new Set(["2026-05-01", "2026-04-30", "2026-04-29"]);
    expect(calculateWorkoutStreak(set, now)).toBe(3);
  });

  it("crosses year boundaries", () => {
    const now = new Date("2026-01-02T12:00:00Z");
    const set = new Set(["2026-01-02", "2026-01-01", "2025-12-31", "2025-12-30"]);
    expect(calculateWorkoutStreak(set, now)).toBe(4);
  });

  it("respects maxDays cap", () => {
    const now = new Date("2026-05-08T12:00:00Z");
    // Build a 10-day continuous streak ending today.
    const set = new Set<string>();
    const cursor = new Date(now);
    for (let i = 0; i < 10; i += 1) {
      set.add(cursor.toISOString().split("T")[0] as string);
      cursor.setDate(cursor.getDate() - 1);
    }
    expect(calculateWorkoutStreak(set, now, 5)).toBe(5);
  });

  it("does not mutate the caller's `now` Date", () => {
    const now = new Date("2026-05-08T12:00:00Z");
    const before = now.getTime();
    calculateWorkoutStreak(new Set([TODAY, YESTERDAY]), now);
    expect(now.getTime()).toBe(before);
  });
});
