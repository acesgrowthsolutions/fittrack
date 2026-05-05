import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.POSTGRES_URL as string;

if (!connectionString) {
  throw new Error("POSTGRES_URL environment variable is not set");
}

type Schema = typeof schema;
type Db = PostgresJsDatabase<Schema>;
type Pg = ReturnType<typeof postgres>;

// Cache the underlying postgres client + drizzle instance on globalThis so
// HMR reloads of this file don't leak connections, and so consumers that
// captured the `db` proxy at boot (e.g. better-auth's drizzle adapter in
// src/lib/auth.ts) keep working even after we rebuild the underlying client.
type Cache = { pgClient?: Pg; drizzle?: Db };
const globalForDb = globalThis as unknown as { __dbCache?: Cache };
if (!globalForDb.__dbCache) globalForDb.__dbCache = {};
const cache = globalForDb.__dbCache;

function buildClient(): Pg {
  return postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 30,
    onnotice: () => {},
  });
}

function getDb(): Db {
  if (!cache.drizzle) {
    if (!cache.pgClient) cache.pgClient = buildClient();
    cache.drizzle = drizzle(cache.pgClient, { schema });
  }
  return cache.drizzle;
}

/**
 * Tear down the cached postgres client + drizzle instance so the next call
 * builds fresh. Call this when queries are persistently failing — the bad
 * pool state will be replaced on the next operation, even for consumers that
 * captured `db` long ago, because every operation goes through `getDb()`.
 */
export function resetDb(): void {
  const prior = cache.pgClient;
  delete cache.pgClient;
  delete cache.drizzle;
  if (prior) prior.end({ timeout: 1 }).catch(() => {});
}

// Stable Proxy: consumers capture this reference once, but every method
// dispatch resolves through getDb() so a reset/rebuild is picked up
// without needing the consumer to re-import.
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const target = getDb();
    const value = Reflect.get(target as object, prop, receiver);
    return typeof value === "function" ? value.bind(target) : value;
  },
}) as Db;
