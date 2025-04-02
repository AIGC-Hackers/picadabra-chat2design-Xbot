import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";
import type { Env } from "../types";

/**
 * D1 database connection instance cache
 */
let dbInstance: DrizzleD1Database<typeof schema> | null = null;

/**
 * Get database connection instance
 * @param env Environment variables, containing D1 database binding
 * @returns Drizzle ORM database instance
 */
export function getDb(env: Env): DrizzleD1Database<typeof schema> {
  if (!dbInstance) {
    dbInstance = drizzle(env.DB, { schema });
  }
  return dbInstance;
}
