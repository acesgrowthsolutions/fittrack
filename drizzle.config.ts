import type { Config } from "drizzle-kit";

// pg v8 treats sslmode=require/prefer/verify-ca as aliases for verify-full.
// pg v9 will switch them to libpq semantics (no cert verification), which is
// weaker. Pin to verify-full now to preserve current behavior across the
// upgrade. See https://github.com/brianc/node-postgres pg-connection-string changelog.
function pinSslMode(url: string): string {
  try {
    const parsed = new URL(url);
    const mode = parsed.searchParams.get("sslmode");
    if (mode === "require" || mode === "prefer" || mode === "verify-ca") {
      parsed.searchParams.set("sslmode", "verify-full");
      return parsed.toString();
    }
  } catch {
    // Malformed URL — let drizzle-kit surface the error.
  }
  return url;
}

export default {
  dialect: "postgresql",
  schema: "./src/lib/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: pinSslMode(process.env.POSTGRES_URL!),
  },
} satisfies Config;
