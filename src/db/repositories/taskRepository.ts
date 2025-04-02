import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "../index";
import { tasks, type Task, type NewTask, TaskStatus } from "../schema/tasks";
import type { Env } from "../../types";
import { TwitterUser } from "../../twitter-api/api/get-post";

/**
 * Task repository - Provides all database operations for the tasks table
 */
export class TaskRepository {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Create new task
   * @param tweetId Original tweet ID
   * @param mentionId Mention tweet ID
   * @returns Created task
   */
  async createTask(tweetId: string, mentionId: string): Promise<Task> {
    const db = getDb(this.env);

    // Check if already exists
    const existingTask = await this.findByMentionId(mentionId);
    if (existingTask) {
      return existingTask;
    }

    const taskId = nanoid();
    const now = Date.now(); 
    const newTask: NewTask = {
      id: taskId,
      tweetId,
      mentionId,
      status: TaskStatus.PENDING,
      createdAt: now,
      updatedAt: now,
      resultImageUrls: null,
      responsePostId: null,
      prompt: null,
      replyText: null,
      requestImageUrls: null,
      attempts: 0,
    };
    
    console.log("newTask", newTask);
    await db.insert(tasks).values(newTask);
    return this.findById(taskId) as Promise<Task>;
  }

  /**
   * Find task by ID
   * @param id Task ID
   * @returns Task or null
   */
  async findById(id: string): Promise<Task | null> {
    const db = getDb(this.env);
    const results = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Find task by mention ID
   * @param mentionId Mention tweet ID
   * @returns Task or null
   */
  async findByMentionId(mentionId: string): Promise<Task | null> {
    const db = getDb(this.env);
    const results = await db
      .select()
      .from(tasks)
      .where(eq(tasks.mentionId, mentionId))
      .limit(1);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Update task status
   * @param id Task ID
   * @param status New status
   * @param errorMessage Optional error message
   * @returns Updated task
   */
  async updateStatus(
    id: string,
    status: TaskStatus,
    errorMessage?: string
  ): Promise<Task | null> {
    const db = getDb(this.env);

    // Build update object
    const updateData: Partial<Task> = {
      status,
      updatedAt: Date.now(),
    };

    if (errorMessage !== undefined) {
      updateData.errorMessage = errorMessage;
    }

    // If status changes to failed, increment retry count
    if (status === TaskStatus.FAILED) {
      const task = await this.findById(id);
      if (task) {
        updateData.attempts = task.attempts + 1;
      }
    }

    await db.update(tasks).set(updateData).where(eq(tasks.id, id));
    return this.findById(id);
  }

  /**
   * Update task result
   * @param id Task ID
   * @param resultImageUrls Generated image URL array
   * @param responsePostId Reply tweet ID
   * @returns Updated task
   */
  async updateResult(
    id: string,
    replyText: string,
    resultImageUrls: string[],
    responsePostId: string
  ): Promise<Task | null> {
    const db = getDb(this.env);
    await db
      .update(tasks)
      .set({
        resultImageUrls: JSON.stringify(resultImageUrls),
        responsePostId,
        replyText,
        status: TaskStatus.COMPLETED,
        updatedAt: Date.now(),
      })
      .where(eq(tasks.id, id));

    return this.findById(id);
  }

  /**
   * Update task prompt and request images
   * @param id Task ID
   * @param prompt Prompt
   * @param requestImageUrls Request image URL array
   * @returns Updated task
   */
  async updatePromptAndImages(
    id: string,
    prompt: string,
    requestImageUrls: string[]
  ): Promise<Task | null> {
    const db = getDb(this.env);
    await db
      .update(tasks)
      .set({
        prompt,
        requestImageUrls: JSON.stringify(requestImageUrls),
        updatedAt: Date.now(),
      })
      .where(eq(tasks.id, id));

    return this.findById(id);
  }

  /**
   * Update original tweet information
   * @param id Task ID
   * @param prompt Original tweet text
   * @param originalImageUrls Original tweet image URL array
   * @param authorUsername Author username
   * @param createdAt Tweet creation time
   * @returns Updated task
   */
  async updateOriginalTweet(
    id: string,
    prompt: string,
    originalImageUrls: string[] | null,
    twitterUser: TwitterUser | undefined
  ): Promise<Task | null> {
    const db = getDb(this.env);
    await db
      .update(tasks)
      .set({
        prompt,
        requestImageUrls: originalImageUrls
          ? JSON.stringify(originalImageUrls)
          : null,
        userInfo: twitterUser ? JSON.stringify(twitterUser) : null,
        updatedAt: Date.now(),
      })
      .where(eq(tasks.id, id));

    return this.findById(id);
  }

  /**
   * Get pending tasks
   * @param limit Limit return count
   * @returns Pending task list
   */
  async getPendingTasks(limit = 10): Promise<Task[]> {
    const db = getDb(this.env);
    return db
      .select()
      .from(tasks)
      .where(eq(tasks.status, TaskStatus.PENDING))
      .orderBy(tasks.createdAt)
      .limit(limit);
  }

  /**
   * Get recently processed tasks
   * @param limit Limit return count
   * @returns Recent task list
   */
  async getRecentTasks(limit = 10): Promise<Task[]> {
    const db = getDb(this.env);
    return db
      .select()
      .from(tasks)
      .orderBy(({ updatedAt }) => desc(updatedAt))
      .limit(limit);
  }
}
