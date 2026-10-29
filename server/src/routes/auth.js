import { Router } from "express";
import rateLimit from "express-rate-limit";
import { createAuthController } from "../controllers/auth.js";
import { createAuthMiddleware, requireCsrf } from "../middleware/auth.js";

export function createAuthRouter(pool, jwtSecret, isProduction) {
  const router = Router();
  const controller = createAuthController(pool, jwtSecret, isProduction);
  const requireAdmin = createAuthMiddleware(jwtSecret, pool);
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many login attempts. Please try again later." },
  });

  router.get("/csrf", controller.csrf);
  router.post("/login", loginLimiter, requireCsrf, controller.login);
  router.post("/logout", requireAdmin, requireCsrf, controller.logout);
  router.get("/me", requireAdmin, controller.me);
  return router;
}
