/**
 * Read-only diagnostic: for a given user email, prints workout/dailyStat
 * counts and existing achievements. Useful to figure out whether a
 * backfill would award anything new.
 *
 * Usage:
 *   pnpm node scripts/user-status.mjs <email>
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const file of [".env.production.local", ".env"]) {
  const p = path.join(__dirname, "..", file);
  if (!existsSync(p)) continue;
  const text = readFileSync(p, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2].replace(/\r$/, "");
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
  break;
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: pnpm node scripts/user-status.mjs <email>");
  process.exit(1);
}

const sql = postgres(process.env.POSTGRES_URL, { max: 1 });
try {
  const [user] = await sql`SELECT id, name FROM "user" WHERE email = ${email} LIMIT 1`;
  if (!user) {
    console.log(`No user with email ${email}.`);
    process.exit(0);
  }
  console.log(`User: ${user.name} (${user.id})\n`);

  const [{ count: workoutCount }] = await sql`SELECT COUNT(*)::int AS count FROM workouts WHERE user_id = ${user.id}`;
  const [{ count: dailyCount }] = await sql`SELECT COUNT(*)::int AS count FROM daily_stats WHERE user_id = ${user.id}`;
  const [maxSteps] = await sql`SELECT MAX(steps)::int AS max_steps FROM daily_stats WHERE user_id = ${user.id}`;

  console.log(`Workouts logged:     ${workoutCount}`);
  console.log(`Daily-stat rows:     ${dailyCount}`);
  console.log(`Max steps in a day:  ${maxSteps?.max_steps ?? 0}`);

  const achievements = await sql`
    SELECT badge_type, badge_name, earned_at
    FROM achievements
    WHERE user_id = ${user.id}
    ORDER BY earned_at ASC
  `;

  console.log(`\nAchievements earned: ${achievements.length}`);
  for (const a of achievements) {
    console.log(`  • ${a.badge_name} (${a.badge_type})`);
  }

  if (workoutCount === 0 && dailyCount === 0) {
    console.log("\nNo activity → no badges would unlock from a backfill.");
  } else if (achievements.length === 0) {
    console.log("\nActivity exists but no achievements awarded — backfill should fix this. Open /achievements on prod to trigger lazy backfill, or run a server-side checkAchievements.");
  }
} finally {
  await sql.end();
}
