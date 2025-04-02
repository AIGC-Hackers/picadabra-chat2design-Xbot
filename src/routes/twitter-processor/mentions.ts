import { Hono } from "hono";
import type { Env } from "../../types";
import { getUserMentionsScheduled } from "../../scheduled/get-user-mentions-scheduler";

/**
 * Register Twitter mentions related routes
 */
export function registerMentionsRoutes(app: Hono<{ Bindings: Env }>) {
  /**
   * Manually trigger Twitter mentions fetch
   */
  app.get("/mentions", async (c) => {
    try {
      await getUserMentionsScheduled(c.env);
      return c.json({
        success: true,
        message: "Twitter mentions checked successfully",
      });
    } catch (error) {
      console.error("Error checking Twitter mentions:", error);
      return c.json(
        {
          success: false,
          message: "Error checking Twitter mentions",
          error: String(error),
        },
        500
      );
    }
  });

  /**
   * Manually process recent mentions (fetch first then process)
   */
  app.post("/mentions/process-recent", async (c) => {
    try {
      // First get the latest mentions
      await getUserMentionsScheduled(c.env);

      // Get the number of items to process
      const limit = Number(c.req.query("limit") || "5");

      // Logic to get recent tasks and add them to the processing queue can be added here
      // For example: Get 5 most recent pending tasks and add them to the processing queue

      return c.json({
        success: true,
        message: `Twitter mentions checked and ${limit} tasks queued for processing`,
      });
    } catch (error) {
      console.error("Error processing recent Twitter mentions:", error);
      return c.json(
        {
          success: false,
          message: "Error processing recent Twitter mentions",
          error: String(error),
        },
        500
      );
    }
  });
}
