import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Verifies that the live Postgres schema enforces invariants that the
 * application code relies on. Skipped automatically when POSTGRES_URL is not
 * set (e.g. CI without a Postgres service) so the suite doesn't fail in
 * environments that intentionally don't have a database. When the DB is
 * present, the schema assertions still run and catch regressions like
 * missing indexes after a migration edit.
 */

const dbUrl = process.env.POSTGRES_URL;
const describeIfDb = dbUrl ? describe : describe.skip;

describeIfDb("achievements: unique (user_id, badge_type) enforced", () => {
  let client: ReturnType<typeof postgres>;

  beforeAll(() => {
    client = postgres(dbUrl!, { max: 1, idle_timeout: 1 });
  });

  afterAll(async () => {
    await client?.end({ timeout: 1 });
  });

  // Pairs with onConflictDoNothing in checkAchievements() to make concurrent
  // award attempts idempotent. Without this index, two racing requests can
  // both pass the existence check and double-insert.
  it("a unique index on (user_id, badge_type) exists", async () => {
    const result = await client<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'achievements'
        AND indexdef ILIKE '%UNIQUE%'
        AND indexdef ILIKE '%user_id%'
        AND indexdef ILIKE '%badge_type%';
    `;
    expect(result.length).toBeGreaterThan(0);
  });
});

describeIfDb("workouts: index layout", () => {
  let client: ReturnType<typeof postgres>;

  beforeAll(() => {
    client = postgres(dbUrl!, { max: 1, idle_timeout: 1 });
  });

  afterAll(async () => {
    await client?.end({ timeout: 1 });
  });

  it("workouts has separate user_id and workout_date indexes (no composite)", async () => {
    const result = await client<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'workouts'
      ORDER BY indexname;
    `;
    const names = result.map((r) => r.indexname);
    expect(names).toContain("workouts_user_id_idx");
    expect(names).toContain("workouts_date_idx");
    // Documents the absence of a composite (user_id, workout_date) index —
    // a known H4 opportunity from the audit, not yet acted on.
    expect(names.some((n) => /user.*date|date.*user/i.test(n))).toBe(false);
  });
});
