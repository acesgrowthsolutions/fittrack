import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

/**
 * Reproduces BUG M3: MET values duplicated in 3 files.
 * If one drifts, calorie estimates diverge across the app.
 */

function extractMET(filePath: string): Record<string, number> {
  const src = readFileSync(filePath, "utf8");
  // Format in this codebase: `{ value: "running", label: "Running", met: 9.8 }`
  const entries: Record<string, number> = {};
  const re = /value:\s*["'](\w+)["'][^}]*met:\s*([\d.]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    entries[m[1] as string] = parseFloat(m[2] as string);
  }
  return entries;
}

describe("BUG M3: MET values duplicated across multiple files", () => {
  const files = [
    "src/components/fitness/workout-form.tsx",
    "src/components/fitness/workout-timer.tsx",
    "src/app/calculator/page.tsx",
  ];

  it("all 3 files define their own MET table", () => {
    for (const f of files) {
      const mets = extractMET(path.resolve(f));
      expect(
        Object.keys(mets).length,
        `${f} should contain a MET table`
      ).toBeGreaterThan(0);
    }
  });

  it("the 3 tables currently agree (will silently drift on future edits)", () => {
    const tables = files.map((f) => extractMET(path.resolve(f)));
    const [a, b, c] = tables;
    // This test PASSES today but is a landmine — any edit to one file
    // that forgets the others will break it.
    expect(b).toEqual(a);
    expect(c).toEqual(a);
  });
});
