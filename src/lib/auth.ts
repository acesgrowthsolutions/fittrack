import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oAuthProxy } from "better-auth/plugins";
import { db } from "./db";
import { passwordResetTemplate, sendEmail, verificationTemplate } from "./email";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

// Stable production URL anchoring OAuth callbacks. Preview deployments
// proxy through this domain via the oAuthProxy plugin so we don't have to
// add every preview URL to the Google authorized redirect list.
const PRODUCTION_URL = "https://fitness-one-rust.vercel.app";

const vercelEnv = process.env.VERCEL_ENV;
const vercelURL = process.env.VERCEL_URL;

// On preview deploys VERCEL_URL is the unique deploy host (e.g.
// fitness-abc123-jennas-projects-...vercel.app). Use it as baseURL so
// Better Auth's cookies and redirects target the actual host the user is
// on, not the production alias inherited from BETTER_AUTH_URL.
//
// `||` instead of `??` because Vercel surfaces unset env vars as empty
// strings, not undefined — `??` would happily forward "" and Better Auth
// would refuse to determine a base URL at runtime. The final fallback to
// PRODUCTION_URL guarantees a usable host even if all three env vars are
// missing/empty on production.
const baseURL =
  vercelEnv === "preview" && vercelURL
    ? `https://${vercelURL}`
    : process.env.BETTER_AUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (vercelEnv === "production" ? PRODUCTION_URL : undefined);

// Only run the OAuth proxy on Vercel-hosted deployments. Locally we use
// a direct redirect URI to localhost — proxying would needlessly bounce
// the flow through production.
const enableOAuthProxy = vercelEnv === "production" || vercelEnv === "preview";

export const auth = betterAuth({
  baseURL,
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
      const { html, text } = passwordResetTemplate(user.email, url);
      await sendEmail({
        to: user.email,
        subject: "Reset your FitTrack password",
        html,
        text,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      const { html, text } = verificationTemplate(user.email, url);
      await sendEmail({
        to: user.email,
        subject: "Confirm your FitTrack email",
        html,
        text,
      });
    },
  },
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            // Always show Google's account picker. Without this, OAuth
            // silently reuses whichever Google account the browser is
            // already signed into, which makes the linkSocial flow useless
            // when the user wants to attach a *different* gmail than the
            // one they routinely sign in with. The "Use another account"
            // option in the picker is the only way to add a second
            // identity from a phone that's only logged into one gmail.
            prompt: "select_account",
          },
        }
      : undefined,
  account: {
    accountLinking: {
      // Google's id_token already proves email ownership, so it's safe to
      // link a Google sign-in to an existing email/password user with the
      // same address instead of creating a duplicate account.
      enabled: true,
      trustedProviders: ["google"],
      // Permits a signed-in user to attach a Google identity whose email
      // differs from their primary email. Used by the "Link Google
      // Account" button on the profile page — without this flag, calling
      // linkSocial() with a mismatched email creates a fresh user
      // instead of attaching to the current session.
      allowDifferentEmails: true,
    },
  },
  plugins: enableOAuthProxy ? [oAuthProxy({ productionURL: PRODUCTION_URL })] : undefined,
});
