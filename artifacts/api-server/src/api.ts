import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Load from local folder first, then root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../../../.env") });

console.log("🔍 API STARTUP: DATABASE_URL is", process.env.DATABASE_URL ? "LOADED ✅" : "MISSING ❌");
if (process.env.DATABASE_URL) {
  console.log("🔗 Connecting to:", process.env.DATABASE_URL.split('@')[1]);
}

import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
