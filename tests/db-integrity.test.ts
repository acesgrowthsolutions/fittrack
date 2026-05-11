import { execSync } from "node:child_process";
import { describe, it, expect } from "vitest";

/**
 * Verifies that the live Postgres schema enforces invariants that the
 * application code relies on. Run against the docker-compose dev DB.
 */

function psql(sql: string): string {
  return execSync(
    `docker exec fitness-postgres-1 psql -U dev_user -d postgres_ss -tAc "${sql.replace(/"/g, '\\"')}"`,
    { encoding: "utf8" }
  ).trim();
}

describe("achievements: unique (user_id, badge_type) enforced", () => {
  // Pairs with onConflictDoNothing in checkAchievements() to make concurrent
  // award attempts idempotent. Without this index, two racing requests can
  // both pass the existence check and double-insert.
  it("a unique index on (user_id, badge_type) exists", () => {
    const result = psql(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'achievements'
        AND indexdef ILIKE '%UNIQUE%'
        AND indexdef ILIKE '%user_id%'
        AND indexdef ILIKE '%badge_type%';
    `);
    expect(result).not.toBe("");
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
