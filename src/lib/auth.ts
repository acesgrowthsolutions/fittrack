import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "./db"
import { passwordResetTemplate, sendEmail, verificationTemplate } from "./email"

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
    sendOnSignUp: false,
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