import { TaskRepository } from "../../db/repositories/taskRepository";
import { Task, TaskStatus } from "../../db/schema/tasks";
import { TwitterPostClient } from "../../twitter-api/api/create-post";
import type { Env } from "../../types";
import { getCredentials } from "../../lib/utils";
import { RateLimitService } from "../rate-limit";
import {
  GeminiResponse,
  generateWithGeminiAndUploadMedia,
  replyToTweet,
} from "./twitter-gemini-service";
import { updateTweetSource } from "./tweet-details-service";

/**
 * Twitter Processing Service
 * Core logic for processing tweet tasks
 */
export class TwitterProcessorService {
  constructor(
    private readonly env: Env,
    private readonly errorFactory: {
      createNonRetryableError: (message: string) => Error;
    }
  ) {}

  /**
   * Main function for processing Twitter tasks
   */
  async processTask(taskId: string): Promise<void> {
    console.log(`Starting to process task: ${taskId}`);

    // Get task information
    const taskInfo = await this.getTaskInfo(taskId);

    // If task should be skipped, return directly
    if (taskInfo.skip) {
      console.log(`Skipping task: ${taskId}`);
      return;
    }

    // Get Twitter credentials
    const credentials = await this.getTwitterCredentials();
    if (!credentials) {
      await this.markTaskAsFailed(taskId, "Failed to get Twitter credentials");
      return;
    }

    // Get tweet details
    await this.getTweetDetailsAndUpdateSource(
      taskId,
      taskInfo.task.tweetId,
      credentials.bearerToken
    );

    // Check user rate limit
    await this.checkUserRateLimit(taskId);

    // Call Gemini API to generate content
    const geminiResponse = await this.generateContentWithAI(
      taskId,
      credentials.bearerToken
    );

    // Reply to tweet
    const replyResult = await this.replyToTweet(
      taskInfo.task.tweetId,
      geminiResponse,
      credentials.bearerToken
    );

    // Update task result
    await this.updateTaskStatus(taskId, replyResult);

    console.log(`Task ${taskId} processing completed`);
  }

  /**
   * Get task information
   */
  async getTaskInfo(taskId: string) {
    const taskRepo = new TaskRepository(this.env);
    const task = await taskRepo.findById(taskId);
    if (!task) {
      console.error(`task not found: ${taskId}`);
      throw this.errorFactory.createNonRetryableError(
        `task not found: ${taskId}`
      );
    }

    if (
      task.status !== TaskStatus.PENDING &&
      task.status !== TaskStatus.FAILED
    ) {
      console.log(`task ${task.id} is not pending or failed, skip`);
      return { skip: true, task };
    }

    // Update task status to processing
    await taskRepo.updateStatus(task.id, TaskStatus.PROCESSING);
    return { skip: false, task };
  }

  /**
   * Get Twitter credentials - pure function that only gets credentials
   */
  async getTwitterCredentials(): Promise<{
    bearerToken: string;
    userId: string;
  }> {
    const creds = await getCredentials(this.env);
    if (!creds) {
      throw new Error("Failed to get Twitter credentials");
    }
    return creds;
  }

  /**
   * Marks a task as failed and throws an error
   */
  async markTaskAsFailed(taskId: string, errorMessage: string) {
    const taskRepo = new TaskRepository(this.env);
    await taskRepo.updateStatus(taskId, TaskStatus.FAILED, errorMessage);
    throw new Error(errorMessage);
  }

  /**
   * Get tweet details and update tweet source
   */
  async getTweetDetailsAndUpdateSource(
    taskId: string,
    tweetId: string,
    bearerToken: string
  ) {
    const task: Task | null = await updateTweetSource(
      taskId,
      tweetId,
      bearerToken,
      this.env
    );
    return { taskInfo: task };
  }

  /**
   * Check user rate limit
   */
  async checkUserRateLimit(taskId: string) {
    const rateLimitService = new RateLimitService(this.env);
    const taskRepo = new TaskRepository(this.env);
    const task = await taskRepo.findById(taskId);
    if (!task) {
      console.error(`task not found: ${taskId}`);
      throw this.errorFactory.createNonRetryableError(
        `task not found: ${taskId}`
      );
    }

    const user = task.userInfo ? JSON.parse(task.userInfo) : null;
    if (!user) {
      return await this.markTaskAsFailed(taskId, "can not get user info");
    }

    const isAllowed = await rateLimitService.isAllowed(user.id);
    if (!isAllowed) {
      const remaining = await rateLimitService.getRemainingCount(user.id);
      const errorMessage = `user ${user.username} : ${user.id} rate limit exceeded, remaining ${remaining} requests`;
      return await this.markTaskAsFailed(taskId, errorMessage);
    }

    return true;
  }

  /**
   * Call AI service to generate content
   */
  async generateContentWithAI(
    taskId: string,
    bearerToken: string
  ): Promise<GeminiResponse | null> {
    console.log(`Calling Gemini to generate content`);
    const taskRepo = new TaskRepository(this.env);
    const task = await taskRepo.findById(taskId);
    if (!task) {
      console.error(`task not found: ${taskId}`);
      throw this.errorFactory.createNonRetryableError(
        `task not found: ${taskId}`
      );
    }

    await taskRepo.updateStatus(taskId, TaskStatus.GENERATING);
    try {
      const geminiResponse: GeminiResponse | null =
        await generateWithGeminiAndUploadMedia(
          task,
          this.env.GEMINI_API_KEY,
          this.env,
          bearerToken
        );
      return geminiResponse;
    } catch (error) {
      const errorMessage =
        "Failed to generate content, error: " +
        (error instanceof Error ? error.message : error);
      await this.markTaskAsFailed(taskId, errorMessage);
      return null;
    }
  }

  /**
   * Send reply tweet
   */
  async replyToTweet(
    tweetId: string,
    geminiResponse: GeminiResponse | null,
    bearerToken: string
  ) {
    if (!geminiResponse) {
      throw new Error("LLM response is null");
    }

    console.log(`Sending reply tweet`);
    const postClient = new TwitterPostClient(bearerToken);
    const responseId = await replyToTweet(postClient, tweetId, geminiResponse);

    return {
      responseId: responseId ?? undefined,
      imageUrl: geminiResponse.imageUrl,
      replyText: geminiResponse.text,
    };
  }

  /**
   * Update task status
   */
  async updateTaskStatus(
    taskId: string,
    replyResult: { responseId?: string; imageUrl?: string; replyText?: string }
  ) {
    console.log(`Updating task ${taskId} status to completed`);
    const taskRepo = new TaskRepository(this.env);
    const imageUrls = replyResult.imageUrl ? [replyResult.imageUrl] : [];

    if (replyResult.responseId) {
      await taskRepo.updateResult(
        taskId,
        replyResult.replyText ?? "",
        imageUrls,
        replyResult.responseId
      );
      return { success: true };
    } else {
      return await this.markTaskAsFailed(
        taskId,
        "Reply tweet failed, unable to get responseId"
      );
    }
  }
}
