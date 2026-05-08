import { describe, it, expect } from "vitest";
import {
  addDays,
  formatDateInTz,
  isValidIanaTz,
  mondayOf,
  startOfMonth,
  startOfYear,
  todayInTz,
} from "@/lib/date-tz";

describe("isValidIanaTz", () => {
  it("accepts known IANA zones", () => {
    expect(isValidIanaTz("UTC")).toBe(true);
    expect(isValidIanaTz("Africa/Johannesburg")).toBe(true);
    expect(isValidIanaTz("America/Los_Angeles")).toBe(true);
    expect(isValidIanaTz("Europe/Berlin")).toBe(true);
  });

  it("rejects garbage / injection attempts", () => {
    expect(isValidIanaTz("not-a-zone")).toBe(false);
    expect(isValidIanaTz("'; DROP TABLE users;--")).toBe(false);
    expect(isValidIanaTz("")).toBe(false);
  });
});

describe("formatDateInTz / todayInTz", () => {
  // These tests reproduce BUG H6: a single moment in time produces different
  // date strings depending on the user's tz. The TZ-aware helper must yield
  // the *user's* date, not the server's UTC date.

  it("PT user at 5pm Monday: UTC is already Tuesday, but user's date is Monday", () => {
    // 2026-04-21 00:00:00 UTC == 2026-04-20 17:00 Pacific
    const moment = new Date("2026-04-21T00:00:00Z");
    expect(formatDateInTz(moment, "UTC")).toBe("2026-04-21");
    expect(formatDateInTz(moment, "America/Los_Angeles")).toBe("2026-04-20");
  });

  it("CET user at 1am: server still says yesterday UTC; user's date is today", () => {
    // 2026-04-20 23:00 UTC == 2026-04-21 01:00 CET
    const moment = new Date("2026-04-20T23:00:00Z");
    expect(formatDateInTz(moment, "UTC")).toBe("2026-04-20");
    expect(formatDateInTz(moment, "Europe/Berlin")).toBe("2026-04-21");
  });

  it("SAST user at 1am: server says yesterday UTC; user's date is today", () => {
    // 2026-05-08 23:00 UTC == 2026-05-09 01:00 SAST
    const moment = new Date("2026-05-08T23:00:00Z");
    expect(formatDateInTz(moment, "UTC")).toBe("2026-05-08");
    expect(formatDateInTz(moment, "Africa/Johannesburg")).toBe("2026-05-09");
  });

  it("todayInTz delegates to formatDateInTz with given moment", () => {
    const moment = new Date("2026-05-08T23:00:00Z");
    expect(todayInTz("Africa/Johannesburg", moment)).toBe("2026-05-09");
    expect(todayInTz("UTC", moment)).toBe("2026-05-08");
  });
});

describe("addDays", () => {
  it("adds positive days", () => {
    expect(addDays("2026-05-08", 1)).toBe("2026-05-09");
    expect(addDays("2026-05-08", 7)).toBe("2026-05-15");
  });

  it("subtracts days", () => {
    expect(addDays("2026-05-08", -1)).toBe("2026-05-07");
    expect(addDays("2026-05-08", -8)).toBe("2026-04-30");
  });

  it("crosses month boundaries", () => {
    expect(addDays("2026-04-30", 1)).toBe("2026-05-01");
    expect(addDays("2026-05-01", -1)).toBe("2026-04-30");
  });

  it("crosses year boundaries", () => {
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("handles leap years", () => {
    // 2024 is a leap year
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2024-02-29", 1)).toBe("2024-03-01");
    // 2025 is not
    expect(addDays("2025-02-28", 1)).toBe("2025-03-01");
  });

  it("rejects malformed strings", () => {
    expect(() => addDays("2026/05/08", 1)).toThrow(RangeError);
    expect(() => addDays("not-a-date", 1)).toThrow(RangeError);
  });
});

describe("mondayOf", () => {
  it("returns the same date when called on a Monday", () => {
    // 2026-05-04 is a Monday
    expect(mondayOf("2026-05-04")).toBe("2026-05-04");
  });

  it("returns Monday for any other weekday", () => {
    // Week of 2026-05-04 (Mon) through 2026-05-10 (Sun)
    expect(mondayOf("2026-05-05")).toBe("2026-05-04"); // Tue
    expect(mondayOf("2026-05-06")).toBe("2026-05-04"); // Wed
    expect(mondayOf("2026-05-07")).toBe("2026-05-04"); // Thu
    expect(mondayOf("2026-05-08")).toBe("2026-05-04"); // Fri
    expect(mondayOf("2026-05-09")).toBe("2026-05-04"); // Sat
    expect(mondayOf("2026-05-10")).toBe("2026-05-04"); // Sun
  });

  it("crosses month/year boundaries", () => {
    // 2026-01-04 is a Sunday → Monday is 2025-12-29
    expect(mondayOf("2026-01-04")).toBe("2025-12-29");
  });
});

describe("startOfMonth / startOfYear", () => {
  it("startOfMonth returns the first of the same month", () => {
    expect(startOfMonth("2026-05-08")).toBe("2026-05-01");
    expect(startOfMonth("2026-05-01")).toBe("2026-05-01");
    expect(startOfMonth("2026-12-31")).toBe("2026-12-01");
  });

  it("startOfYear returns Jan 1 of the same year", () => {
    expect(startOfYear("2026-05-08")).toBe("2026-01-01");
    expect(startOfYear("2026-12-31")).toBe("2026-01-01");
  });
});
