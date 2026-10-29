import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createAuthRouter } from "./routes/auth.js";
import { createInquiryRouter } from "./routes/inquiries.js";
import { AppError, errorHandler, notFoundHandler } from "./middleware/errors.js";

export function createApp({ pool, env = process.env }) {
  if (!env.JWT_SECRET || Buffer.byteLength(env.JWT_SECRET) < 32) {
    throw new Error("JWT_SECRET must contain at least 32 bytes");
  }
  if (env.NODE_ENV === "production" && !env.FRONTEND_ORIGIN?.trim()) {
    throw new Error("FRONTEND_ORIGIN is required in production");
  }
  const allowedOrigins = (env.FRONTEND_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", env.NODE_ENV === "production" ? 1 : false);
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new AppError(403, "Origin is not allowed by CORS"));
    },
    credentials: true,
  }));
  app.use(express.json({ limit: "16kb" }));
  app.use(cookieParser());
  app.get("/api/health", async (_req, res, next) => {
    try {
      await pool.query("SELECT 1");
      return res.json({ status: "ok" });
    } catch (error) {
      return next(error);
    }
  });
  app.use("/api/auth", createAuthRouter(pool, env.JWT_SECRET, env.NODE_ENV === "production"));
  app.use("/api/inquiries", createInquiryRouter(pool, env.JWT_SECRET));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
