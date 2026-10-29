import "dotenv/config";
import bcrypt from "bcrypt";
import { pool } from "../src/db/pool.js";

const { ADMIN_NAME: name, ADMIN_EMAIL: rawEmail, ADMIN_PASSWORD: password } = process.env;
const email = rawEmail?.trim().toLowerCase();

if (!name?.trim() || name.trim().length > 100 || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Set a valid ADMIN_NAME (up to 100 chars) and ADMIN_EMAIL in server/.env.");
  process.exitCode = 1;
} else if (!password || password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
  console.error("ADMIN_PASSWORD must be between 12 and 72 characters for bcrypt.");
  process.exitCode = 1;
} else {
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query(
      `INSERT INTO admins (name, email, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING`,
      [name.trim(), email, passwordHash],
    );
    console.log("Admin creation completed. If the email already existed, no account was changed.");
  } catch (error) {
    console.error("Unable to create the admin account:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
