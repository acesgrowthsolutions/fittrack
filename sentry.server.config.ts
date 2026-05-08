import * as Sentry from "@sentry/nextjs";

// No-ops when SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN is unset, so this is safe
// to deploy before the Vercel Marketplace integration is provisioned.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
});
