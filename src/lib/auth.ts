import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "./db"
import { passwordResetTemplate, sendEmail, verificationTemplate } from "./email"

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  // IP-keyed rate limits on the auth surface. Memory storage is per-instance,
  // so on Vercel serverless these behave as a soft per-instance cap rather
  // than a strict global limit — keep the windows generous so legitimate
  // users (typos, retries) aren't locked out.
  rateLimit: {
    enabled: true,
    storage: "memory",
    customRules: {
      // Credential stuffing: cap guess rate per IP.
      "/sign-in/email": { window: 60, max: 20 },
      // Signup spam: a single IP can't churn fake accounts.
      "/sign-up/email": { window: 3600, max: 10 },
      // Password reset spam. Better Auth exposes this as
      // /api/auth/request-password-reset — the customRules key is the
      // path after /api/auth.
      "/request-password-reset": { window: 3600, max: 10 },
    },
  },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      const { html, text } = passwordResetTemplate(user.email, url)
      await sendEmail({
        to: user.email,
        subject: "Reset your FitTrack password",
        html,
        text,
      })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      const { html, text } = verificationTemplate(user.email, url)
      await sendEmail({
        to: user.email,
        subject: "Confirm your FitTrack email",
        html,
        text,
      })
    },
  },
})