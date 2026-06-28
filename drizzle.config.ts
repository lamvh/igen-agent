import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "file:./local.db";
// Turso (libSQL) khi URL là remote; file local vẫn dùng dialect sqlite.
const isTurso = /^(libsql|https?|wss?):/.test(url);

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  ...(isTurso
    ? {
        dialect: "turso",
        dbCredentials: { url, authToken: process.env.TURSO_AUTH_TOKEN },
      }
    : {
        dialect: "sqlite",
        dbCredentials: { url },
      }),
});
