import { headers } from "next/headers";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";

type StatusLevel = "ok" | "warn" | "error";

interface DiagnosticsResponse {
  timestamp: string;
  env: {
    POSTGRES_URL: boolean;
    BETTER_AUTH_SECRET: boolean;
    GOOGLE_CLIENT_ID: boolean;
    GOOGLE_CLIENT_SECRET: boolean;
    OPENROUTER_API_KEY: boolean;
    NEXT_PUBLIC_APP_URL: boolean;
    RESEND_API_KEY: boolean;
    EMAIL_FROM: boolean;
  };
  database: {
    connected: boolean;
    schemaApplied: boolean;
    error?: string;
  };
  auth: {
    configured: boolean;
    routeResponding: boolean | null;
  };
  ai: {
    configured: boolean;
  };
  email: {
    configured: boolean;
    deliveryMode: "resend" | "console-fallback";
  };
  storage: {
    configured: boolean;
    type: "local" | "remote";
  };
  overallStatus: StatusLevel;
}

// Public endpoint, but the cost surface is asymmetric: env flags are free,
// DB pings cost a connection + 5s timeout window, and the route used to
// self-fetch `/api/auth/session` which doubled invocations per call. An
// unauthenticated attacker hitting this in a loop was a real DoS amplification
// vector (separate 5s timer per request, separate session-route invocation).
//
// Fix: anyone can read env-flag booleans (enough for an ops smoke test), but
// the live DB ping is gated behind a signed-in session, and the self-fetch is
// gone — `auth.routeResponding` is now derived statically from env config.
export async function GET(_req: Request) {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  const includeDetails = !!session || process.env.NODE_ENV !== "production";
  const runLiveChecks = !!session || process.env.NODE_ENV !== "production";

  const env = {
    POSTGRES_URL: Boolean(process.env.POSTGRES_URL),
    BETTER_AUTH_SECRET: Boolean(process.env.BETTER_AUTH_SECRET),
    GOOGLE_CLIENT_ID: Boolean(process.env.GOOGLE_CLIENT_ID),
    GOOGLE_CLIENT_SECRET: Boolean(process.env.GOOGLE_CLIENT_SECRET),
    OPENROUTER_API_KEY: Boolean(process.env.OPENROUTER_API_KEY),
    NEXT_PUBLIC_APP_URL: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
    EMAIL_FROM: Boolean(process.env.EMAIL_FROM),
  } as const;

  // Database checks with timeout. Skipped for unauthenticated callers in
  // production so a public hit does not trigger a DB connection + 5s timer.
  let dbConnected = false;
  let schemaApplied = false;
  let dbError: string | undefined;
  if (!runLiveChecks) {
    // Unauth in prod: report based on whether the URL is even set; do not
    // attempt a connection.
    dbError = env.POSTGRES_URL ? "Sign in to run live database check" : "POSTGRES_URL is not set";
  } else if (env.POSTGRES_URL) {
    try {
      // Add timeout to prevent hanging on unreachable database
      const dbCheckPromise = (async () => {
        const [{ db, resetDb }, { sql }, schema] = await Promise.all([
          import("@/lib/db"),
          import("drizzle-orm"),
          import("@/lib/schema"),
        ]);

        // Ping DB - this will actually attempt to connect
        let result;
        try {
          result = await db.execute(sql`SELECT 1 as ping`);
        } catch (firstErr) {
          // If the cached postgres client is in a broken state, tear it
          // down and retry once. Subsequent queries (including the ones
          // better-auth runs through the shared `db` proxy) will then go
          // against the freshly rebuilt client.
          resetDb();
          try {
            result = await db.execute(sql`SELECT 1 as ping`);
          } catch {
            throw firstErr;
          }
        }
        if (!result) {
          throw new Error("Database query returned no result");
        }
        dbConnected = true;

        try {
          // Touch a known table to verify migrations
          await db.select().from(schema.user).limit(1);
          schemaApplied = true;
        } catch {
          schemaApplied = false;
          if (!dbError) {
            dbError = "Schema not applied. Run: pnpm run db:migrate";
          }
        }
      })();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database connection timeout (5s)")), 5000)
      );

      await Promise.race([dbCheckPromise, timeoutPromise]);
    } catch (e) {
      dbConnected = false;
      schemaApplied = false;
      const err = e as Error & { cause?: { message?: string; code?: string } };
      // Surface the actual cause so we can diagnose connection issues
      // (refused, auth failed, wrong db name, broken cached client, etc.)
      dbError = `${err.message}${err.cause?.message ? ` | cause: ${err.cause.message}` : ""}${err.cause?.code ? ` (${err.cause.code})` : ""}`;
    }
  } else {
    dbConnected = false;
    schemaApplied = false;
    dbError = "POSTGRES_URL is not set";
  }

  const authConfigured = env.BETTER_AUTH_SECRET;
  // Auth route readiness was previously verified by self-fetching
  // /api/auth/session per request. That doubled the invocation count per
  // diagnostics call and added no information beyond "is BETTER_AUTH_SECRET
  // set" — the route is mounted statically by Better Auth and only fails to
  // respond when auth itself is misconfigured. Derive from config instead.
  const authRouteResponding: boolean | null = authConfigured ? true : null;
  const aiConfigured = env.OPENROUTER_API_KEY; // We avoid live-calling the AI provider here

  // Email config: in production, missing RESEND_API_KEY means password-reset
  // and verification emails are silently dropped (we fall back to console
  // logging, which Vercel logs but real users can't see).
  const emailConfigured = env.RESEND_API_KEY;
  const emailDeliveryMode: "resend" | "console-fallback" = emailConfigured
    ? "resend"
    : "console-fallback";

  // Storage configuration check
  const storageConfigured = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const storageType: "local" | "remote" = storageConfigured ? "remote" : "local";

  const overallStatus: StatusLevel = (() => {
    if (!env.POSTGRES_URL || !dbConnected || !schemaApplied) return "error";
    if (!authConfigured) return "error";
    // In production, no email provider means broken password reset.
    if (process.env.NODE_ENV === "production" && !emailConfigured) return "warn";
    // AI is optional; warn if not configured
    if (!aiConfigured) return "warn";
    return "ok";
  })();

  const body: DiagnosticsResponse = {
    timestamp: new Date().toISOString(),
    env,
    database: {
      connected: dbConnected,
      schemaApplied,
      ...(dbError !== undefined && includeDetails && { error: dbError }),
    },
    auth: {
      configured: authConfigured,
      routeResponding: authRouteResponding,
    },
    ai: {
      configured: aiConfigured,
    },
    email: {
      configured: emailConfigured,
      deliveryMode: emailDeliveryMode,
    },
    storage: {
      configured: storageConfigured,
      type: storageType,
    },
    overallStatus,
  };

  // Alert on real outages only. Sentry dedupes by fingerprint, so a sustained
  // outage produces one issue (with mounting event count) rather than spam.
  if (overallStatus === "error" && process.env.VERCEL_ENV === "production") {
    const fingerprint: string[] = ["diagnostics"];
    if (!env.POSTGRES_URL) fingerprint.push("postgres-url-missing");
    else if (!dbConnected) fingerprint.push("db-disconnected");
    else if (!schemaApplied) fingerprint.push("schema-missing");
    if (!authConfigured) fingerprint.push("auth-misconfigured");

    Sentry.captureMessage(`Diagnostics failed: ${fingerprint.slice(1).join(",") || "unknown"}`, {
      level: "error",
      fingerprint,
      tags: { route: "api/diagnostics" },
      extra: {
        dbConnected,
        schemaApplied,
        dbError,
        authConfigured,
        authRouteResponding,
      },
    });
  }

  return NextResponse.json(body, {
    status: 200,
  });
}
