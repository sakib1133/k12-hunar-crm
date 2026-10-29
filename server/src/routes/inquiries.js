import { Router } from "express";
import rateLimit from "express-rate-limit";
import { createInquiryController } from "../controllers/inquiries.js";
import { createAuthMiddleware, requireCsrf } from "../middleware/auth.js";

export function createInquiryRouter(pool, jwtSecret) {
  const router = Router();
  const controller = createInquiryController(pool);
  const requireAdmin = createAuthMiddleware(jwtSecret, pool);
  const submissionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many inquiries from this network. Please try again later." },
  });

  router.post("/", submissionLimiter, controller.submit);
  router.get("/", requireAdmin, controller.list);
  router.patch("/:id/status", requireAdmin, requireCsrf, controller.updateStatus);
  return router;
}
