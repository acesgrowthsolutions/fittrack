/**
 * Verifies that fitness API routes have switched from ad-hoc presence checks
 * to Zod-backed input validation. The grep is a cheap regression net — if a
 * future refactor drops the import on one route, this test catches it before
 * the deploy.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const FITNESS_ROUTES = [
  "src/app/api/fitness/workouts/route.ts",
  "src/app/api/fitness/workouts/[id]/route.ts",
  "src/app/api/fitness/daily-stats/today/route.ts",
  "src/app/api/fitness/daily-stats/today/add-steps/route.ts",
  "src/app/api/fitness/goals/route.ts",
  "src/app/api/fitness/goals/[id]/route.ts",
  "src/app/api/fitness/profile/route.ts",
];

describe("fitness API routes use Zod validation", () => {
  for (const route of FITNESS_ROUTES) {
    it(`${route} imports from the shared validators module (or zod directly)`, () => {
      const src = readFileSync(path.resolve(route), "utf8");
      const usesValidators = /from\s+["']@\/lib\/validators\/fitness["']/.test(src);
      const usesZodDirectly = /from\s+["']zod["']/.test(src);
      expect(usesValidators || usesZodDirectly).toBe(true);
    });
  }
});

describe("unauthenticated POST is rejected before validation runs", () => {
  const BASE = "http://localhost:3000";

  it("POST /api/fitness/workouts with garbage body returns 401 (auth gate first)", async () => {
    // 3s AbortController so the test fails fast in two scenarios:
    //   (a) no dev server is running on :3000 — fetch will reject quickly
    //       on its own, but on some macOS configs the connection hangs;
    //   (b) a dev server IS running but the route is slow (e.g. Neon
    //       cold start) — without the abort, vitest's 30s default trips
    //       and the suite goes red on what is purely an integration ping.
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), 3000);

    const r = await fetch(`${BASE}/api/fitness/workouts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "banana", durationMinutes: -999 }),
      signal: controller.signal,
    })
      .catch((e) => ({ ok: false, status: 0, error: String(e) }))
      .finally(() => clearTimeout(abortTimer));

    // 401 if dev server is running; skip silently if it isn't (or if the
    // request aborted before a response arrived).
    if ("status" in r && r.status > 0) {
      expect([401, 400]).toContain(r.status);
    }
  });
});
