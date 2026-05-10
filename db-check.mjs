import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: './artifacts/api-server/.env' });

const connectionString = process.env.DATABASE_URL;

console.log("🔍 Testing Connection to:", connectionString?.split('@')[1]);

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const start = Date.now();
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    client.release();
    console.log("✅ SUCCESS!");
    console.log("⏱️  Response Time:", Date.now() - start, "ms");
    console.log("📅 Database Time:", res.rows[0].now);
    process.exit(0);
  } catch (err) {
    console.error("❌ FAILED!");
    console.error("📝 Error Message:", err.message);
    if (err.message.includes("password authentication failed")) {
      console.error("💡 HINT: Your password in DATABASE_URL is wrong.");
    } else if (err.message.includes("ENOTFOUND")) {
      console.error("💡 HINT: Could not find the database host. Check your URL.");
    }
    process.exit(1);
  }
}

check();
