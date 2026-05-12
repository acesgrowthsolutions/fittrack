/**
 * Locks in single-source-of-truth between the server-side badge list and
 * the client-side achievements page. Previously the page held its own
 * hardcoded ALL_BADGES, which silently drifted from BADGE_DEFINITIONS and
 * hid newly-added badges from users even though they were being awarded.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { BADGE_DEFINITIONS } from "@/lib/badge-definitions";

describe("achievements page sources badges from BADGE_DEFINITIONS", () => {
  const src = readFileSync(path.resolve("src/app/achievements/page.tsx"), "utf8");

  it("imports BADGE_DEFINITIONS from the canonical module", () => {
    expect(src).toMatch(/from\s+["']@\/lib\/badge-definitions["']/);
    expect(src).toMatch(/import\s+\{[^}]*BADGE_DEFINITIONS[^}]*\}/);
  });

  it("does not redeclare an inline badge list", () => {
    // Catches a regression where someone re-adds a `const ALL_BADGES = [...]`
    // with name/type/description fields — the previous duplication pattern.
    expect(src).not.toMatch(/const\s+ALL_BADGES\s*[:=]/);
    // A badge-shaped inline object literal (type + name + description) in
    // the page file would be the smoking gun for re-duplication.
    const inlineRe = /type:\s*["']\w+["'][\s\S]{0,80}name:\s*["']/;
    expect(src).not.toMatch(inlineRe);
  });

  it("includes a style entry for every badge in BADGE_DEFINITIONS", () => {
    for (const b of BADGE_DEFINITIONS) {
      // Each badge type must appear as a key in the BADGE_STYLES map.
      // Quoted (e.g. "10k_steps") or bare (e.g. first_workout) both match.
      const re = new RegExp(
        `(?:["']?)${b.type.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:["']?)\\s*:\\s*\\{`
      );
      expect(src, `missing BADGE_STYLES entry for ${b.type}`).toMatch(re);
    }
  });
});
