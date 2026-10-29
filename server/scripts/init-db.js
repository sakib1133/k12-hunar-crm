import "dotenv/config";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { pool } from "../src/db/pool.js";

try {
  const schemaPath = new URL("../../schema.sql", import.meta.url);
  const schema = await readFile(fileURLToPath(schemaPath), "utf8");
  await pool.query(schema);
  console.log("Database schema applied successfully.");
} catch (error) {
  console.error("Unable to initialize the database:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
