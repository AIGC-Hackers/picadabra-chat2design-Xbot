import {
  WorkflowEntrypoint,
  WorkflowStep,
  WorkflowEvent,
} from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import type { Env } from "../types";
import { TwitterProcessorService } from "../services/twitter/twitter-processor-service";

type TwitterProcessorParams = {
  taskId: string;
};

export class TwitterProcessorWorkflow extends WorkflowEntrypoint<
  Env,
  TwitterProcessorParams
> {
  private service!: TwitterProcessorService;

  async run(event: WorkflowEvent<TwitterProcessorParams>, step: WorkflowStep) {
    const taskId = event.payload.taskId;
    console.log(`Starting to process task: ${taskId}`);

    // Initialize service class
    this.service = new TwitterProcessorService(this.env, {
      createNonRetryableError: (message: string) =>
        new NonRetryableError(message),
    });

    // Get task information
    const taskInfo = await step.do(
      "Get task information",
      {
        retries: {
          limit: 2,
          delay: "5 seconds",
          backoff: "exponential",
        },
      },
      async () => {
        return await this.service.getTaskInfo(taskId);
      }
    );

    // If task should be skipped, return directly
    if (taskInfo.skip) {
      console.log(`Skipping task: ${taskId}`);
      return;
    }

    // Get Twitter credentials
    const credentials = await step.do(
      "Get Twitter credentials",
      {
        retries: {
          limit: 2,
          delay: "5 seconds",
          backoff: "exponential",
        },
      },
      async () => {
        return await this.service.getTwitterCredentials();
      }
    );

    // Get tweet details
    await step.do(
      "Get tweet details & update tweet source",
      {
        retries: {
          limit: 2,
          delay: "10 seconds",
          backoff: "exponential",
        },
      },
      async () => {
        return await this.service.getTweetDetailsAndUpdateSource(
          taskId,
          taskInfo.task.tweetId,
          credentials.bearerToken
        );
      }
    );

    // Check user rate limit
    await step.do(
      "Check user rate limit",
      {
        retries: {
          limit: 2,
          delay: "10 seconds",
          backoff: "exponential",
        },
      },
      async () => {
        return await this.service.checkUserRateLimit(taskId);
      }
    );

    // Call Gemini API to generate content
    const geminiResponse = await step.do(
      "Call AI service",
      {
        retries: {
          limit: 2,
          delay: "10 seconds",
          backoff: "exponential",
        },
        timeout: "10 minutes",
      },
      async () => {
        return await this.service.generateContentWithAI(
          taskId,
          credentials.bearerToken
        );
      }
    );

    // Reply to tweet
    const replyResult = await step.do(
      "Send reply tweet",
      {
        retries: {
          limit: 2,
          delay: "20 seconds",
          backoff: "exponential",
        },
      },
      async () => {
        return await this.service.replyToTweet(
          taskInfo.task.tweetId,
          geminiResponse,
          credentials.bearerToken
        );
      }
    );

    // Update task result
    await step.do(
      "Update task status",
      {
        retries: {
          limit: 2,
          delay: "5 seconds",
          backoff: "exponential",
        },
      },
      async () => {
        return await this.service.updateTaskStatus(taskId, replyResult);
      }
    );

    console.log(`Task ${taskId} processing completed`);
  }
}
