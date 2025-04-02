import { Hono } from "hono";
import { TaskRepository } from "../../db/repositories/taskRepository";
import type { Env } from "../../types";
import { TwitterProcessorService } from "../../services/twitter/twitter-processor-service";

/**
 * Routes for processing Twitter tasks
 */
export function registerProcessRoutes(app: Hono<{ Bindings: Env }>) {
  /**
   * Process Twitter task
   */
  app.post("/process", async (c) => {
    try {
      console.log("Received task processing request");

      // Get task ID
      let taskId;
      try {
        const body = await c.req.json();
        taskId = body.taskId;
        console.log("Request body parsed successfully:", { taskId });
      } catch (error) {
        console.error("Failed to parse request body:", error);
        return c.json(
          {
            error: "Failed to parse request body",
            details: error instanceof Error ? error.message : String(error),
          },
          400
        );
      }

      if (!taskId) {
        console.log("Request missing taskId parameter");
        return c.json({ error: "Missing task ID" }, 400);
      }

      // Create service instance, pass error factory
      const twitterService = new TwitterProcessorService(c.env, {
        createNonRetryableError: (message: string) => new Error(message),
      });

      try {
        // Directly call service processing method
        await twitterService.processTask(taskId);

        // Get processing result
        const taskRepo = new TaskRepository(c.env);
        const task = await taskRepo.findById(taskId);

        if (!task) {
          return c.json({ error: `Task not found: ${taskId}` }, 404);
        }

        return c.json({
          success: true,
          message: `Task ${taskId} processing completed`,
          responseId: task.responsePostId,
          imageUrl: task.resultImageUrls
            ? JSON.parse(task.resultImageUrls)[0]
            : undefined,
          replyText: task.replyText,
        });
      } catch (error) {
        console.error("Error processing task:", error);
        return c.json(
          {
            error: "Error processing task",
            details: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
          500
        );
      }
    } catch (error) {
      console.error("Error processing task:", error);
      return c.json(
        {
          error: "Error processing task",
          details: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        500
      );
    }
  });
}
