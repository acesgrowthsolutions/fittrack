import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

/**
 * Regression net for the MET-duplication fix. Verifies the three consumer
 * files import from the shared @/lib/met-values module and no longer define
 * their own inline MET tables. Without this, a future edit could re-introduce
 * a local copy and silently diverge from the others.
 */

const CONSUMERS = [
  "src/components/fitness/workout-form.tsx",
  "src/components/fitness/workout-timer.tsx",
  "src/app/calculator/page.tsx",
];

const INLINE_MET_TABLE_RE = /value:\s*["']\w+["'][^}]*met:\s*[\d.]+/;

describe("MET values: single source of truth", () => {
  for (const file of CONSUMERS) {
    it(`${file} imports from @/lib/met-values`, () => {
      const src = readFileSync(path.resolve(file), "utf8");
      expect(src).toMatch(/from\s+["']@\/lib\/met-values["']/);
    });

    it(`${file} does not define its own inline MET table`, () => {
      const src = readFileSync(path.resolve(file), "utf8");
      expect(src).not.toMatch(INLINE_MET_TABLE_RE);
    });
  }
});
