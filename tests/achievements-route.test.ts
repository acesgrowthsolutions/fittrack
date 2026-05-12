/**
 * Source-level checks for the achievements API surface. Locks in the lazy-
 * backfill contract: visiting /api/fitness/achievements must trigger a
 * checkAchievements call so users newly qualifying for badges (e.g. ones
 * added in a later release) see them awarded without a separate workout
 * log. Editing a workout must also re-check, since duration/calorie/
 * distance edits can flip qualification.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const achievementsGet = readFileSync(
  path.resolve("src/app/api/fitness/achievements/route.ts"),
  "utf8"
);
const workoutPut = readFileSync(path.resolve("src/app/api/fitness/workouts/[id]/route.ts"), "utf8");

describe("achievements GET lazily backfills", () => {
  it("imports checkAchievements", () => {
    expect(achievementsGet).toMatch(
      /import\s+\{[^}]*checkAchievements[^}]*\}\s+from\s+["']@\/lib\/achievements["']/
    );
  });

  it("invokes checkAchievements before returning", () => {
    // The call must happen inside the GET handler. Easiest check: the call
    // appears at all, and before the Response.json that returns earned data.
    expect(achievementsGet).toMatch(/checkAchievements\(\s*userId\s*\)/);
    const checkIdx = achievementsGet.indexOf("checkAchievements(userId)");
    const returnIdx = achievementsGet.indexOf("return Response.json({ earned, progress }");
    expect(checkIdx).toBeGreaterThan(0);
    expect(returnIdx).toBeGreaterThan(checkIdx);
  });
});

describe("workout PUT re-runs checkAchievements", () => {
  it("imports and calls checkAchievements after a successful update", () => {
    expect(workoutPut).toMatch(/from\s+["']@\/lib\/achievements["']/);
    expect(workoutPut).toMatch(/checkAchievements\(session\.user\.id\)/);
  });
});
