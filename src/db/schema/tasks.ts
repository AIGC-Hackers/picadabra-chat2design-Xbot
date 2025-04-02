import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

/**
 * Task status enum
 */
export enum TaskStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  GENERATING = "generating",
  COMPLETED = "completed",
  FAILED = "failed",
}

/**
 * Task table definition
 */
export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    tweetId: text("tweet_id").notNull(),
    mentionId: text("mention_id").notNull().unique(),
    mentionTweetUrl: text("mention_tweet_url"),
    status: text("status").notNull().default(TaskStatus.PENDING),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    attempts: integer("attempts").notNull().default(0),
    errorMessage: text("error_message"),
    resultImageUrls: text("result_image_urls"), // Stored as JSON string
    responsePostId: text("response_post_id"),
    prompt: text("prompt"),
    replyText: text("reply_text"),
    requestImageUrls: text("request_image_urls"), // Stored as JSON string
    userInfo: text("user_info"), // Stored as JSON string
  },
  (t) => [index("tweet_id_idx").on(t.tweetId)]
);

// Export types for type inference
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
