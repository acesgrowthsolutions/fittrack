/**
 * Quick diagnostic: list all users in the DB pointed to by env. Read-only.
 *
 * Usage:
 *   pnpm node scripts/list-users.mjs
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
  console.log(`[env: ${file}]`);
  break;
}

const sql = postgres(process.env.POSTGRES_URL, { max: 1 });
try {
  const rows = await sql`
    SELECT email, name, created_at,
      (SELECT COUNT(*) FROM achievements WHERE user_id = "user".id) AS achievements
    FROM "user"
    ORDER BY created_at DESC
    LIMIT 20
  `;
  if (rows.length === 0) {
    console.log("No users in this DB.");
    process.exit(0);
  }
  console.log(`\nUsers (${rows.length}):\n`);
  for (const r of rows) {
    console.log(`  ${r.email}   ${r.name}   ${r.achievements} achievements   created ${new Date(r.created_at).toISOString().slice(0, 10)}`);
  }
} finally {
  await sql.end();
}
