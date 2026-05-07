import { readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import postgres from 'postgres'
import { hashPassword } from 'better-auth/crypto'

const envFile = readFileSync(new URL('../.env', import.meta.url), 'utf8')
for (const line of envFile.split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (!m) continue
  let v = m[2].replace(/\r$/, '')
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1)
  }
  if (!process.env[m[1]]) process.env[m[1]] = v
}

const email = process.argv[2]
const explicitPassword = process.argv[3]
if (!email) {
  console.error('Usage: node scripts/reset-password.mjs <email> [password]')
  process.exit(1)
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#%&*'
const generatedPassword = (() => {
  const bytes = randomBytes(20)
  let out = ''
  for (let i = 0; i < bytes.length; i++) out += ALPHABET[bytes[i] % ALPHABET.length]
  return out
})()
const newPassword = explicitPassword ?? generatedPassword

const sql = postgres(process.env.POSTGRES_URL, { max: 1 })
try {
  const [u] = await sql`SELECT id FROM "user" WHERE email = ${email} LIMIT 1`
  if (!u) {
    console.error(`No user found with email: ${email}`)
    process.exit(2)
  }
  const hash = await hashPassword(newPassword)
  const updated = await sql`
    UPDATE account
    SET password = ${hash}, updated_at = NOW()
    WHERE user_id = ${u.id} AND provider_id = 'credential'
    RETURNING id
  `
  if (updated.length === 0) {
    console.error('No credential account row found for that user — they may have signed up via an OAuth provider only.')
    process.exit(3)
  }
  console.log(`Password reset for ${email}`)
  console.log(`New password: ${newPassword}`)
} finally {
  await sql.end()
}
