import jwt from "jsonwebtoken";
import { AppError } from "./errors.js";

export function createAuthMiddleware(jwtSecret, pool) {
  return async function requireAdmin(req, _res, next) {
    const token = req.cookies?.admin_token;
    if (!token) {
      return next(new AppError(401, "Authentication required"));
    }

    let admin;
    try {
      admin = jwt.verify(token, jwtSecret, {
        algorithms: ["HS256"],
        issuer: "k12-hunar-crm",
        audience: "k12-hunar-admin",
      });
    } catch {
      return next(new AppError(401, "Authentication required"));
    }

    if (admin.role !== "admin" || !admin.sub) {
      return next(new AppError(401, "Authentication required"));
    }

    req.admin = admin;
    try {
      const activeAdmin = await pool.query(
        "SELECT id FROM admins WHERE id = $1 AND is_active = TRUE",
        [admin.sub],
      );
      if (!activeAdmin.rows[0]) {
        return next(new AppError(401, "Authentication required"));
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export function requireCsrf(req, _res, next) {
  const cookieToken = req.cookies?.csrf_token;
  const headerToken = req.get("x-csrf-token");
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(new AppError(403, "Invalid CSRF token"));
  }
  return next();
}
