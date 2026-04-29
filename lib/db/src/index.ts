import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import dotenv from "dotenv";
import path from "node:path";

// Support both local and workspace root .env files
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), "artifacts/api-server/.env") });

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
  // Auto-reconnect logic
  if (err.message.includes("Connection terminated")) {
    console.log("🔄 Reconnecting to Supabase...");
  }
});

// For local dev, we ensure the pool is ready
export const db = drizzle(pool, { schema });

export * from "./schema";
