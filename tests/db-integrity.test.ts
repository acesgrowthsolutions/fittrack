import { execSync } from "node:child_process";
import { describe, it, expect } from "vitest";

/**
 * Reproduces BUG M2 by inspecting the live Postgres schema.
 *
 * The achievements table does NOT have a unique constraint on
 * (user_id, badge_type), so concurrent writes can create duplicate badges.
 */

function psql(sql: string): string {
  return execSync(
    `docker exec fitness-postgres-1 psql -U dev_user -d postgres_ss -tAc "${sql.replace(/"/g, '\\"')}"`,
    { encoding: "utf8" }
  ).trim();
}

describe("BUG M2: achievements table lacks unique (user_id, badge_type)", () => {
  it("no unique constraint exists on (user_id, badge_type)", () => {
    const result = psql(`
      SELECT conname
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'achievements' AND c.contype = 'u';
    `);
    // BUG: empty result means no unique constraint — duplicates are allowed
    expect(result).toBe("");
  });

  it("no unique index on (user_id, badge_type) — only the pkey is unique", () => {
    const result = psql(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'achievements'
        AND indexdef ILIKE '%UNIQUE%'
        AND indexname <> 'achievements_pkey';
    `);
    // BUG: no app-level unique constraint; only the id primary key is unique
    expect(result).toBe("");
  });
});

describe("BUG H4: workouts missing composite (user_id, workout_date) index", () => {
  it("workouts has separate user_id and workout_date indexes, no composite", () => {
    const result = psql(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'workouts'
      ORDER BY indexname;
    `);
    // Confirm we have the single-column indexes (suboptimal for filtered range queries)
    expect(result).toContain("workouts_user_id_idx");
    expect(result).toContain("workouts_date_idx");
    // But no composite index
    expect(result).not.toMatch(/user.*date|date.*user/i);
  });
});
