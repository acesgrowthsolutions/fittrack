import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "./db"

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  // IP-keyed rate limits on the auth surface. Default Better Auth only
  // enables these in production; we enable them in dev too so abuse can't
  // sneak in via local testing and the limits are exercised by tests.
  rateLimit: {
    enabled: true,
    storage: "memory",
    customRules: {
      // Credential stuffing: cap guess rate per IP.
      "/sign-in/email": { window: 60, max: 5 },
      // Signup spam: a single IP can't churn fake accounts.
      "/sign-up/email": { window: 3600, max: 5 },
      // Password reset spam.
      "/forget-password": { window: 3600, max: 3 },
    },
  },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      // Log password reset URL to terminal (no email integration yet)
      // eslint-disable-next-line no-console
      console.log(`\n${"=".repeat(60)}\nPASSWORD RESET REQUEST\nUser: ${user.email}\nReset URL: ${url}\n${"=".repeat(60)}\n`)
    },
  },
  emailVerification: {
    sendOnSignUp: false,
    sendVerificationEmail: async ({ user, url }) => {
      // Log verification URL to terminal (no email integration yet)
      // eslint-disable-next-line no-console
      console.log(`\n${"=".repeat(60)}\nEMAIL VERIFICATION\nUser: ${user.email}\nVerification URL: ${url}\n${"=".repeat(60)}\n`)
    },
  },
})