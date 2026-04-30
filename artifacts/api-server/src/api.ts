import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import serverless from "serverless-http";

// Load environment variables before anything else
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../../../.env") });

import app from "./app";
import { logger } from "./lib/logger";

// ── Netlify Serverless Export ──
// Netlify Functions look for this named export
export const handler = serverless(app);

// ── Local Development Server ──
// Only start listening when running locally (not in serverless)
if (!process.env.NETLIFY && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const port = Number(process.env.PORT || 5001);
  app.listen(port, () => {
    logger.info({ port }, "Server listening");
  });
}
