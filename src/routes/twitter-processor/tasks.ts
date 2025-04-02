import { Hono } from "hono";
import { TaskRepository } from "../../db/repositories/taskRepository";
import { tasks } from "../../db/schema/tasks";
import type { Env } from "../../types";
import { eq } from "drizzle-orm";
import { getDb } from "../../db/index";

/**
 * Register task management related routes
 */
export function registerTasksRoutes(app: Hono<{ Bindings: Env }>) {
  /**
   * API for creating new tasks
   */
  app.post("/tasks", async (c) => {
    try {
      // Get request body data
      const body = await c.req.json();
      const { tweetId, mentionId, mentionTweetUrl } = body;

      // Validate required parameters
      if (!tweetId || !mentionId) {
        return c.json(
          {
            success: false,
            error:
              "Missing required parameters: tweetId and mentionId are required",
          },
          400
        );
      }

      console.log(
        `Creating new task: tweetId=${tweetId}, mentionId=${mentionId}`
      );

      // Create task
      const taskRepo = new TaskRepository(c.env);
      const task = await taskRepo.createTask(tweetId, mentionId);

      // If URL is provided, update task
      if (mentionTweetUrl && task) {
        // Manually update mentionTweetUrl, since there's no dedicated method in repository
        const db = getDb(c.env);
        await db
          .update(tasks)
          .set({ mentionTweetUrl })
          .where(eq(tasks.id, task.id));
      }

      return c.json({
        success: true,
        message: "Task created successfully",
        task,
      });
    } catch (error) {
      console.error("Failed to create task:", error);
      return c.json(
        {
          success: false,
          error: "Failed to create task",
          details: error instanceof Error ? error.message : String(error),
        },
        500
      );
    }
  });

  /**
   * Get recent tasks list
   */
  app.get("/tasks/recent", async (c) => {
    try {
      const limit = Number(c.req.query("limit") || "10");
      const taskRepo = new TaskRepository(c.env);
      const tasks = await taskRepo.getRecentTasks(limit);

      return c.json({
        success: true,
        count: tasks.length,
        tasks,
      });
    } catch (error) {
      console.error("Failed to get recent tasks:", error);
      return c.json(
        {
          success: false,
          error: "Failed to get recent tasks",
          details: error instanceof Error ? error.message : String(error),
        },
        500
      );
    }
  });

  /**
   * Get pending tasks list
   */
  app.get("/tasks/pending", async (c) => {
    try {
      const limit = Number(c.req.query("limit") || "10");
      const taskRepo = new TaskRepository(c.env);
      const tasks = await taskRepo.getPendingTasks(limit);

      return c.json({
        success: true,
        count: tasks.length,
        tasks,
      });
    } catch (error) {
      console.error("Failed to get pending tasks:", error);
      return c.json(
        {
          success: false,
          error: "Failed to get pending tasks",
          details: error instanceof Error ? error.message : String(error),
        },
        500
      );
    }
  });

  /**
   * Get task details
   */
  app.get("/tasks/:id", async (c) => {
    try {
      const taskId = c.req.param("id");
      const taskRepo = new TaskRepository(c.env);
      const task = await taskRepo.findById(taskId);

      if (!task) {
        return c.json(
          {
            success: false,
            error: `Task not found: ${taskId}`,
          },
          404
        );
      }

      return c.json({
        success: true,
        task,
      });
    } catch (error) {
      console.error("Failed to get task details:", error);
      return c.json(
        {
          success: false,
          error: "Failed to get task details",
          details: error instanceof Error ? error.message : String(error),
        },
        500
      );
    }
  });

  /**
   * Trigger task workflow
   * Start workflow processing for the task by taskId
   */
  app.post("/tasks/:id/trigger-workflow", async (c) => {
    try {
      const taskId = c.req.param("id");
      const taskRepo = new TaskRepository(c.env);
      const task = await taskRepo.findById(taskId);

      if (!task) {
        return c.json(
          {
            success: false,
            error: `Task not found: ${taskId}`,
          },
          404
        );
      }

      let instance = await c.env.MY_TWITTER_WORKFLOW.get(taskId);
      if (instance) {
        let status = await instance.status();
        return c.json({
          success: true,
          message: `Workflow for task ${taskId} already exists, status: ${status}`,
        });
      }

      // Start workflow
      console.log(`Triggering workflow for task ${taskId}`);

      await c.env.MY_TWITTER_WORKFLOW.create({
        id: taskId,
      });

      return c.json({
        success: true,
        message: `Workflow for task ${taskId} has been triggered`,
        taskId: taskId,
      });
    } catch (error) {
      console.error(`Failed to trigger task workflow:`, error);
      return c.json(
        {
          success: false,
          error: "Failed to trigger task workflow",
          details: error instanceof Error ? error.message : String(error),
        },
        500
      );
    }
  });
}
