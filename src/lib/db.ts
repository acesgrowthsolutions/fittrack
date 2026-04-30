import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.POSTGRES_URL as string;

if (!connectionString) {
  throw new Error("POSTGRES_URL environment variable is not set");
}

const globalForPg = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForPg.pgClient ??
  postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 30,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgClient = client;
}

export const db = drizzle(client, { schema });
