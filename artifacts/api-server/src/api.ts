import dotenv from "dotenv";
import path from "node:path";
import serverless from "serverless-http";

// Load environment variables — works in both CJS and ESM contexts
// In CJS (Netlify), __dirname is available natively
// In ESM (local dev), __dirname comes from the banner shim
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import app from "./app";
import { logger } from "./lib/logger";

// ── Netlify Serverless Export ──
export const handler = serverless(app);

// ── Local Development Server ──
if (!process.env.NETLIFY && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const port = Number(process.env.PORT || 5001);
  app.listen(port, () => {
    logger.info({ port }, "Server listening");
  });
}
