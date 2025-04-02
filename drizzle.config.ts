import type { Config } from "drizzle-kit";

/**
 * Drizzle migration configuration
 */
export default {
  schema: "./src/db/schema/*",
  out: "./src/db/migrations",
  dialect: "sqlite",
  driver: "d1-http",
  breakpoints: true,
  verbose: true,
  strict: true,
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    token: process.env.CLOUDFLARE_D1_TOKEN!,
  },
} satisfies Config;
