import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
const isServerless = !!(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  // Worker threads don't work in serverless environments (Lambda/Netlify)
  // Only enable pino-pretty transport for local development
  ...(!isProduction && !isServerless
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }
    : {}),
});
