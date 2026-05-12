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

  // The composite serves WHERE user_id = ? AND workout_date {>=, BETWEEN} ?
  // (the summary / totals / streak query shape) and, via leftmost-prefix
  // usage, also serves user_id-only filters.
  it("workouts has a composite (user_id, workout_date) index", async () => {
    const result = await client<{ indexdef: string }[]>`
      SELECT indexdef FROM pg_indexes
      WHERE tablename = 'workouts'
        AND indexdef ILIKE '%user_id%'
        AND indexdef ILIKE '%workout_date%';
    `;
    expect(result.length).toBeGreaterThan(0);
  });

  it("workouts retains the date-only index for range-by-date queries", async () => {
    const result = await client<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes WHERE tablename = 'workouts';
    `;
    expect(result.map((r) => r.indexname)).toContain("workouts_date_idx");
  });
});
