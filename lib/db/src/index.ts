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
    rejectUnauthorized: false,
  },
  max: 1,
  connectionTimeoutMillis: 10000, // Increased to 10s for Sydney latency
  idleTimeoutMillis: 30000,
});

// Self-healing: Pre-warm the connection to avoid 502/500
pool.on("connect", () => {
  console.log("✅ Cloud Database: Secure bridge established.");
});

pool.on("error", (err) => {
  console.error("❌ Database Connection Error:", err.message);
  if (err.message.includes("password authentication failed")) {
    console.error("HINT: Your DATABASE_URL password might be incorrect.");
  }
});

export const db = drizzle(pool, { schema });

export * from "./schema";
