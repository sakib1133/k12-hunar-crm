import { AppError } from "../middleware/errors.js";
import { validateInquiry, validateStatus, USER_TYPES, CATEGORIES, STATUSES } from "../validation/inquiries.js";

export function createInquiryController(pool) {
  return {
    async submit(req, res, next) {
      try {
        const inquiry = validateInquiry(req.body);
        const result = await pool.query(
          `INSERT INTO inquiries (name, email, phone, user_type, category, message)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, name, category, status, created_at`,
          [inquiry.name, inquiry.email, inquiry.phone, inquiry.userType, inquiry.category, inquiry.message],
        );
        return res.status(201).json({ inquiry: result.rows[0] });
      } catch (error) {
        return next(error);
      }
    },

    async list(req, res, next) {
      try {
        const { category, userType, search, status } = req.query;
        if (category && !CATEGORIES.includes(category)) {
          throw new AppError(400, "Invalid category filter");
        }
        if (userType && !USER_TYPES.includes(userType)) {
          throw new AppError(400, "Invalid user type filter");
        }
        if (status && !STATUSES.includes(status)) {
          throw new AppError(400, "Invalid status filter");
        }

        const page = Number(req.query.page ?? "1");
        const limit = Number(req.query.limit ?? "25");
        if (!Number.isSafeInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
          throw new AppError(400, "Page must be positive and limit must be between 1 and 100");
        }
        const offset = (page - 1) * limit;
        if (!Number.isSafeInteger(offset) || offset > 2_147_483_647) {
          throw new AppError(400, "Requested page is too large");
        }
        if (search !== undefined && (typeof search !== "string" || search.length > 120)) {
          throw new AppError(400, "Search must be 120 characters or fewer");
        }

        const conditions = [];
        const values = [];
        const addFilter = (sql, value) => {
          values.push(value);
          conditions.push(sql.replace("?", `$${values.length}`));
        };
        if (category) addFilter("category = ?", category);
        if (userType) addFilter("user_type = ?", userType);
        if (status) addFilter("status = ?", status);
        const normalizedSearch = search?.trim();
        if (normalizedSearch) {
          values.push(`%${normalizedSearch.replace(/[\\%_]/g, "\\$&")}%`);
          conditions.push(`(name ILIKE $${values.length} ESCAPE '\\' OR phone ILIKE $${values.length} ESCAPE '\\')`);
        }

        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        const countResult = await pool.query(
          `SELECT COUNT(*)::int AS total FROM inquiries ${where}`,
          values,
        );
        const total = countResult.rows[0].total;
        const rowsResult = await pool.query(
          `SELECT id, name, email, phone, user_type AS "userType", category, status, created_at AS "createdAt"
           FROM inquiries ${where}
           ORDER BY created_at DESC
           LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
          [...values, limit, offset],
        );
        const statsResult = await pool.query(
          `SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE status = 'New')::int AS new,
             COUNT(*) FILTER (WHERE status = 'In Progress')::int AS in_progress,
             COUNT(*) FILTER (WHERE status = 'Resolved')::int AS resolved
           FROM inquiries`,
        );

        return res.json({
          inquiries: rowsResult.rows,
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
          stats: statsResult.rows[0],
        });
      } catch (error) {
        return next(error);
      }
    },

    async updateStatus(req, res, next) {
      try {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.params.id)) {
          throw new AppError(400, "Invalid inquiry ID");
        }
        const status = validateStatus(req.body?.status);
        const result = await pool.query(
          `UPDATE inquiries SET status = $1 WHERE id = $2
           RETURNING id, status, updated_at AS "updatedAt"`,
          [status, req.params.id],
        );
        if (!result.rowCount) {
          throw new AppError(404, "Inquiry not found");
        }
        return res.json({ inquiry: result.rows[0] });
      } catch (error) {
        return next(error);
      }
    },
  };
}
