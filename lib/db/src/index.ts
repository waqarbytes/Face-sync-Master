import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL is not set. Database operations will fail.");
}

const pool = new pg.Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // Required for Supabase cloud connections
  },
  max: 1, // Keep it lean for serverless
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

// We remove the blocking test-connect here to speed up serverless start

export const db = drizzle(pool, { schema });

export * from "./schema";
