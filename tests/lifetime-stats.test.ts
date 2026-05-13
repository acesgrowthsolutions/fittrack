import { describe, expect, it } from "vitest";
import { computeLifetimeStats } from "@/lib/lifetime-stats";

describe("computeLifetimeStats: empty", () => {
  it("returns zeros and nulls when no dates", () => {
    expect(computeLifetimeStats([])).toEqual({
      days: 0,
      weeks: 0,
      months: 0,
      years: 0,
      firstActiveDate: null,
      lastActiveDate: null,
    });
  });

  it("ignores malformed date strings", () => {
    expect(computeLifetimeStats(["not-a-date", "", "2026/05/13"])).toEqual({
      days: 0,
      weeks: 0,
      months: 0,
      years: 0,
      firstActiveDate: null,
      lastActiveDate: null,
    });
  });
});

describe("computeLifetimeStats: single-day activity", () => {
  it("one active day = 1 day, 1 week, 1 month, 1 year", () => {
    expect(computeLifetimeStats(["2026-05-13"])).toEqual({
      days: 1,
      weeks: 1,
      months: 1,
      years: 1,
      firstActiveDate: "2026-05-13",
      lastActiveDate: "2026-05-13",
    });
  });

  it("dedupes duplicate input dates", () => {
    const r = computeLifetimeStats(["2026-05-13", "2026-05-13", "2026-05-13"]);
    expect(r.days).toBe(1);
  });
});

describe("computeLifetimeStats: bucket semantics", () => {
  it("two days in the same ISO week count as 1 week", () => {
    // 2026-05-11 = Mon, 2026-05-13 = Wed (same ISO week)
    const r = computeLifetimeStats(["2026-05-11", "2026-05-13"]);
    expect(r.days).toBe(2);
    expect(r.weeks).toBe(1);
    expect(r.months).toBe(1);
    expect(r.years).toBe(1);
  });

  it("two days in adjacent ISO weeks count as 2 weeks", () => {
    // 2026-05-10 = Sun, 2026-05-11 = Mon (different ISO weeks)
    const r = computeLifetimeStats(["2026-05-10", "2026-05-11"]);
    expect(r.weeks).toBe(2);
  });

  it("two days in the same month, different weeks = 2 weeks, 1 month", () => {
    const r = computeLifetimeStats(["2026-05-01", "2026-05-31"]);
    expect(r.weeks).toBeGreaterThanOrEqual(2);
    expect(r.months).toBe(1);
  });

  it("two days in different months = 2 months", () => {
    const r = computeLifetimeStats(["2026-05-31", "2026-06-01"]);
    expect(r.months).toBe(2);
  });

  it("two days in different years = 2 years, 2 months", () => {
    const r = computeLifetimeStats(["2025-12-31", "2026-01-01"]);
    expect(r.years).toBe(2);
    expect(r.months).toBe(2);
  });
});

describe("computeLifetimeStats: first/last", () => {
  it("reports earliest and latest dates regardless of input order", () => {
    const r = computeLifetimeStats(["2026-05-13", "2024-01-01", "2025-08-15"]);
    expect(r.firstActiveDate).toBe("2024-01-01");
    expect(r.lastActiveDate).toBe("2026-05-13");
  });
});

describe("computeLifetimeStats: ISO week edge cases", () => {
  it("Jan 1 belongs to the prior year's last ISO week when it falls on Fri-Sun", () => {
    // 2027-01-01 is a Friday → ISO week is 53 of 2026.
    // 2027-01-04 is a Monday → ISO week 1 of 2027.
    const r = computeLifetimeStats(["2027-01-01", "2027-01-04"]);
    expect(r.weeks).toBe(2);
  });

  it("late Dec belongs to next year's ISO week 1 when Dec 31 is Mon-Wed", () => {
    // 2024-12-31 is a Tuesday → ISO week 1 of 2025.
    // 2025-01-01 is a Wednesday → ISO week 1 of 2025.
    const r = computeLifetimeStats(["2024-12-31", "2025-01-01"]);
    expect(r.weeks).toBe(1);
  });
});
