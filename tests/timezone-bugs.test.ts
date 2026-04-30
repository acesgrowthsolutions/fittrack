import { describe, it, expect } from "vitest";

/**
 * Reproduces BUG H6 and M1.
 *
 * The app buckets "today" using UTC:
 *   new Date().toISOString().split("T")[0]
 *
 * This is wrong for any user not in UTC — their "today" can differ from the
 * server's UTC "today" by up to 12 hours.
 */

function serverToday(now: Date): string {
  return now.toISOString().split("T")[0] as string;
}

describe("BUG H6: UTC date bucketing", () => {
  it("PT user at 5pm Monday sees wrong day — server says Tuesday", () => {
    // Monday April 20, 2026 at 5:00 pm Pacific = Tuesday April 21 at 00:00 UTC
    const monday5pmPT = new Date("2026-04-21T00:00:00Z");
    expect(serverToday(monday5pmPT)).toBe("2026-04-21");
    // But the user experiences it as Monday the 20th
    const userLocalDate = "2026-04-20";
    expect(serverToday(monday5pmPT)).not.toBe(userLocalDate);
  });

  it("CET user at 1am sees yesterday — server still says yesterday UTC", () => {
    // Tuesday April 21 at 1:00 am CET = Monday April 20 at 23:00 UTC
    const tue1amCET = new Date("2026-04-20T23:00:00Z");
    expect(serverToday(tue1amCET)).toBe("2026-04-20");
    // User thinks it's the 21st
    const userLocalDate = "2026-04-21";
    expect(serverToday(tue1amCET)).not.toBe(userLocalDate);
  });

  it("Streak calculation: two workouts on the same LOCAL day bucket as different UTC days", () => {
    // Two workouts by the same PT user on Monday April 20:
    //   - 10am PT Monday  = 17:00 UTC Monday  -> bucket "2026-04-20"
    //   - 11pm PT Monday  = 06:00 UTC Tuesday -> bucket "2026-04-21"
    const workout1 = new Date("2026-04-20T17:00:00Z");
    const workout2 = new Date("2026-04-21T06:00:00Z");
    expect(serverToday(workout1)).toBe("2026-04-20");
    expect(serverToday(workout2)).toBe("2026-04-21");
    // Both workouts happened on the same LOCAL day (Monday) but server
    // treats them as 2 different days → inflates streaks for evening users.
  });
});

describe("BUG M1: toISOString on invalid Date throws", () => {
  it("Invalid Date.toISOString() throws RangeError", () => {
    const bad = new Date("not-a-date");
    expect(() => bad.toISOString()).toThrow(RangeError);
  });
});
