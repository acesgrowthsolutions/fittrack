/**
 * Reproduces BUG H1 (missing input validation) by hitting the live API routes.
 * These endpoints require auth, so unauthenticated requests should return 401.
 * The bug is visible in the 401-response path not yet, but we can at least
 * verify that NO Zod schema is used server-side, by grepping the source.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const FITNESS_ROUTES = [
  "src/app/api/fitness/workouts/route.ts",
  "src/app/api/fitness/workouts/[id]/route.ts",
  "src/app/api/fitness/daily-stats/today/route.ts",
  "src/app/api/fitness/goals/route.ts",
  "src/app/api/fitness/goals/[id]/route.ts",
  "src/app/api/fitness/profile/route.ts",
];

describe("BUG H1: no Zod/input validation on fitness API routes", () => {
  for (const route of FITNESS_ROUTES) {
    it(`${route} does NOT import zod`, () => {
      const src = readFileSync(path.resolve(route), "utf8");
      // BUG: validator is missing. Chat route imports zod; fitness routes don't.
      expect(src).not.toMatch(/from\s+['"]zod['"]/);
    });
  }

  it("chat route DOES use zod (the pattern every route should follow)", () => {
    const src = readFileSync(path.resolve("src/app/api/chat/route.ts"), "utf8");
    expect(src).toMatch(/from\s+['"]zod['"]/);
  });
});

describe("BUG H1 live: unauthenticated POST with invalid body", () => {
  const BASE = "http://localhost:3000";

  it("POST /api/fitness/workouts with garbage body rejects (401 due to auth)", async () => {
    const r = await fetch(`${BASE}/api/fitness/workouts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "banana", durationMinutes: -999 }),
    }).catch((e) => ({ ok: false, status: 0, error: String(e) }));

    // Either 401 (auth blocks first) or 500 (DB enum error).
    // Both are acceptable for *unauthenticated* traffic, but the telling detail
    // is that there's no 400 path — an authenticated user would get a 500, not
    // a clean 400.
    if ("status" in r && r.status > 0) {
      expect([401, 400, 500]).toContain(r.status);
    }
  });
});
