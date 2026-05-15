import { readFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { hashPassword } from "better-auth/crypto";

// Load env from .env.production.local first (so this works against prod
// after `vercel env pull .env.production.local`) and fall back to .env
// for local-dev runs. Matches the loading order used by the other scripts
// in this directory.
for (const file of [".env.production.local", ".env"]) {
  const url = new URL(`../${file}`, import.meta.url);
  if (!existsSync(url)) continue;
  const envFile = readFileSync(url, "utf8");
  for (const line of envFile.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2].replace(/\r$/, "");
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
  console.log(`[env source: ${file}]`);
  break;
}

const email = process.argv[2] ?? "test@example.com";
const password = process.argv[3] ?? "Test12345!";
const name = process.argv[4] ?? "Test User";

const sql = postgres(process.env.POSTGRES_URL, { max: 1 });
try {
  const hash = await hashPassword(password);

  const [existing] = await sql`SELECT id FROM "user" WHERE email = ${email} LIMIT 1`;

  let userId;
  if (existing) {
    userId = existing.id;
    await sql`UPDATE "user" SET email_verified = true, updated_at = NOW() WHERE id = ${userId}`;
    const updated = await sql`
      UPDATE account
      SET password = ${hash}, updated_at = NOW()
      WHERE user_id = ${userId} AND provider_id = 'credential'
      RETURNING id
    `;
    if (updated.length === 0) {
      await sql`
        INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
        VALUES (${randomUUID()}, ${userId}, 'credential', ${userId}, ${hash}, NOW(), NOW())
      `;
    }
    console.log(`Updated existing user ${email}`);
  } else {
    userId = randomUUID();
    await sql`
      INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
      VALUES (${userId}, ${name}, ${email}, true, NOW(), NOW())
    `;
    await sql`
      INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
      VALUES (${randomUUID()}, ${userId}, 'credential', ${userId}, ${hash}, NOW(), NOW())
    `;
    console.log(`Created user ${email}`);
  }

  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  User ID:  ${userId}`);
} finally {
  await sql.end();
}
