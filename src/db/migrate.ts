import { migrate } from "drizzle-orm/d1/migrator";
import { getDb } from "./index";
import type { Env } from "../types";

/**
 * Run database migrations
 * @param env Environment variables
 */
export async function runMigrations(env: Env): Promise<void> {
  const db = getDb(env);
  console.log("Starting database migrations...");

  try {
    await migrate(db, { migrationsFolder: "./src/db/migrations" });
    console.log("Database migration completed successfully");
  } catch (error) {
    console.error("Database migration failed:", error);
    throw error;
  }
}
