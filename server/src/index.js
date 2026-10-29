import "dotenv/config";
import { createApp } from "./app.js";
import { pool } from "./db/pool.js";

const app = createApp({ pool });
const port = Number(process.env.PORT ?? 4000);

const server = app.listen(port, () => {
  console.log(`K12 Hunar CRM API listening on port ${port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received; closing server`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
