import { describe, it, expect } from "vitest";
import { calculateWorkoutStreak } from "@/lib/workout-streak";

const TODAY = "2026-05-08";
const YESTERDAY = "2026-05-07";
const TWO_DAYS_AGO = "2026-05-06";
const THREE_DAYS_AGO = "2026-05-05";

describe("calculateWorkoutStreak", () => {
  it("returns 0 for an empty set", () => {
    expect(calculateWorkoutStreak(new Set(), TODAY)).toBe(0);
  });

  it("returns 1 when only today has a workout", () => {
    expect(calculateWorkoutStreak(new Set([TODAY]), TODAY)).toBe(1);
  });

  it("is lenient: returns 1 when only yesterday has a workout", () => {
    expect(calculateWorkoutStreak(new Set([YESTERDAY]), TODAY)).toBe(1);
  });

  it("counts consecutive days ending today", () => {
    const set = new Set([TODAY, YESTERDAY, TWO_DAYS_AGO]);
    expect(calculateWorkoutStreak(set, TODAY)).toBe(3);
  });

  it("counts consecutive days ending yesterday", () => {
    const set = new Set([YESTERDAY, TWO_DAYS_AGO, THREE_DAYS_AGO]);
    expect(calculateWorkoutStreak(set, TODAY)).toBe(3);
  });

  it("breaks the streak at the first gap", () => {
    const set = new Set([TODAY, TWO_DAYS_AGO]);
    expect(calculateWorkoutStreak(set, TODAY)).toBe(1);
  });

  it("returns 0 when the most recent workout is two days ago", () => {
    const set = new Set([TWO_DAYS_AGO, THREE_DAYS_AGO]);
    expect(calculateWorkoutStreak(set, TODAY)).toBe(0);
  });

  it("ignores far-past workouts when there is no recent activity", () => {
    expect(calculateWorkoutStreak(new Set(["2025-12-01"]), TODAY)).toBe(0);
  });

  it("handles duplicate dates gracefully (Set already dedupes)", () => {
    const set = new Set([TODAY, TODAY, YESTERDAY]);
    expect(calculateWorkoutStreak(set, TODAY)).toBe(2);
  });

  it("crosses month boundaries", () => {
    const today = "2026-05-01";
    const set = new Set(["2026-05-01", "2026-04-30", "2026-04-29"]);
    expect(calculateWorkoutStreak(set, today)).toBe(3);
  });

  it("crosses year boundaries", () => {
    const today = "2026-01-02";
    const set = new Set([
      "2026-01-02",
      "2026-01-01",
      "2025-12-31",
      "2025-12-30",
    ]);
    expect(calculateWorkoutStreak(set, today)).toBe(4);
  });

  it("respects maxDays cap", () => {
    const today = "2026-05-08";
    // Build a 10-day continuous streak ending today.
    const set = new Set<string>();
    let cursor = today;
    for (let i = 0; i < 10; i += 1) {
      set.add(cursor);
      const [y, m, d] = cursor.split("-").map(Number) as [
        number,
        number,
        number,
      ];
      const prev = new Date(Date.UTC(y, m - 1, d) - 86_400_000);
      const yy = prev.getUTCFullYear();
      const mm = String(prev.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(prev.getUTCDate()).padStart(2, "0");
      cursor = `${yy}-${mm}-${dd}`;
    }
    expect(calculateWorkoutStreak(set, today, 5)).toBe(5);
  });
});
