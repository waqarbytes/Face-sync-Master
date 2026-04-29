import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL is not set. Database operations will fail.");
}

const pool = new pg.Pool({
  connectionString,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

// Test connection
pool.connect()
  .then(() => console.log("Successfully connected to Supabase PostgreSQL"))
  .catch((err) => console.error("Failed to connect to Supabase PostgreSQL:", err));

export const db = drizzle(pool, { schema });

export * from "./schema";
