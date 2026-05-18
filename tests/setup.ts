// Vitest setup: load env files into process.env so tests that depend on
// local configuration (db-integrity expects POSTGRES_URL) work without
// manual env exports. Uses Node 22+'s built-in process.loadEnvFile() —
// which is intentionally non-overriding: variables already in process.env
// stay put. We therefore load in *priority* order (highest first), the
// inverse of how Next.js/Vite usually phrase it, so .env.local's
// developer overrides win over the template defaults in .env. Missing
// files are fine — tests that need specific env vars should skip
// themselves rather than fail.
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // File absent — continue with whatever was already in process.env.
  }
}
