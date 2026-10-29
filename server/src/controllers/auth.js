import { randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AppError } from "../middleware/errors.js";
import { validateLogin } from "../validation/admin.js";

function cookieOptions(isProduction) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };
}

export function createAuthController(pool, jwtSecret, isProduction) {
  const baseCookieOptions = cookieOptions(isProduction);
  const csrfCookieOptions = { ...baseCookieOptions, httpOnly: false };
  let dummyPasswordHash;

  return {
    csrf(_req, res) {
      const token = randomBytes(32).toString("hex");
      res.cookie("csrf_token", token, { ...csrfCookieOptions, maxAge: 8 * 60 * 60 * 1000 });
      return res.json({ csrfToken: token });
    },

    async login(req, res, next) {
      try {
        const { email, password } = validateLogin(req.body);
        const result = await pool.query(
          `SELECT id, name, email, password_hash, role
           FROM admins WHERE email = $1 AND is_active = TRUE`,
          [email],
        );
        const admin = result.rows[0];
        if (!dummyPasswordHash) dummyPasswordHash = await bcrypt.hash("invalid-login-timing-value", 12);
        const passwordMatches = await bcrypt.compare(password, admin?.password_hash ?? dummyPasswordHash);

        if (!admin || !passwordMatches) {
          throw new AppError(401, "Email or password is incorrect");
        }

        const token = jwt.sign(
          { sub: admin.id, email: admin.email, role: admin.role },
          jwtSecret,
          { algorithm: "HS256", expiresIn: "8h", issuer: "k12-hunar-crm", audience: "k12-hunar-admin" },
        );
        res.cookie("admin_token", token, { ...baseCookieOptions, maxAge: 8 * 60 * 60 * 1000 });
        return res.json({ admin: { id: admin.id, name: admin.name, email: admin.email } });
      } catch (error) {
        return next(error);
      }
    },

    logout(_req, res) {
      res.clearCookie("admin_token", baseCookieOptions);
      res.clearCookie("csrf_token", csrfCookieOptions);
      return res.status(204).end();
    },

    async me(req, res, next) {
      try {
        const result = await pool.query(
          `SELECT id, name, email FROM admins WHERE id = $1 AND is_active = TRUE`,
          [req.admin.sub],
        );
        if (!result.rows[0]) {
          throw new AppError(401, "Authentication required");
        }
        return res.json({ admin: result.rows[0] });
      } catch (error) {
        return next(error);
      }
    },
  };
}
