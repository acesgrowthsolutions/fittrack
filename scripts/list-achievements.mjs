/**
 * Read-only CLI: prints the achievements a user has earned, sorted by date.
 *
 * Reads POSTGRES_URL from .env.production.local (preferred) or .env. Looks
 * up the user by email, then queries the `achievements` table.
 *
 * Usage:
 *   pnpm node scripts/list-achievements.mjs <email>
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envCandidates = [".env.production.local", ".env"];
let loadedFrom = null;
for (const file of envCandidates) {
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
  loadedFrom = file;
  break;
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: pnpm node scripts/list-achievements.mjs <email>");
  process.exit(1);
}

const dbUrl = process.env.POSTGRES_URL;
if (!dbUrl) {
  console.error("POSTGRES_URL is not set. Tried:", envCandidates.join(", "));
  process.exit(1);
}

console.log(`[env source: ${loadedFrom ?? "process env only"}]`);
console.log(`[looking up: ${email}]\n`);

const sql = postgres(dbUrl, { max: 1 });
try {
  const [user] = await sql`SELECT id, name FROM "user" WHERE email = ${email} LIMIT 1`;
  if (!user) {
    console.log(`No user with email ${email}.`);
    process.exit(0);
  }
  console.log(`User: ${user.name} (id ${user.id})`);

  const rows = await sql`
    SELECT badge_type, badge_name, description, earned_at
    FROM achievements
    WHERE user_id = ${user.id}
    ORDER BY earned_at ASC
  `;

  if (rows.length === 0) {
    console.log("\nNo achievements earned yet.");
    process.exit(0);
  }

  console.log(`\nEarned ${rows.length} achievement${rows.length === 1 ? "" : "s"}:\n`);
  for (const r of rows) {
    const when = new Date(r.earned_at).toISOString().slice(0, 16).replace("T", " ");
    console.log(`  • ${r.badge_name}`);
    console.log(`      type:   ${r.badge_type}`);
    console.log(`      what:   ${r.description}`);
    console.log(`      earned: ${when} UTC\n`);
  }
} finally {
  await sql.end();
}
