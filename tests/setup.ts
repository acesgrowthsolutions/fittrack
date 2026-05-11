// Vitest setup: load .env into process.env so tests that depend on local
// configuration (db-integrity expects POSTGRES_URL) work without manual env
// exports. Uses Node 22+'s built-in process.loadEnvFile() to avoid a runtime
// dependency on dotenv. Missing .env is fine — tests that need env vars
// should skip themselves rather than fail.
try {
  process.loadEnvFile(".env");
} catch {
  // No .env present (e.g. CI without secrets injected) — leave process.env
  // as-is and let env-sensitive tests skip.
}
