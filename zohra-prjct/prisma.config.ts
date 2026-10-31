// Load local application settings before falling back to the standard `.env`.
import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

loadEnv({ path: ".env.local" });
loadEnv();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prefer a direct connection for Prisma CLI operations when configured,
    // but allow deployments with only DATABASE_URL to generate the client.
    url: process.env.DIRECT_URL ?? env("DATABASE_URL"),
  },
});
