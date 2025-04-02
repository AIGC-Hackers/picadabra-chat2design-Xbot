import {
  GetMentionsOptions,
  TwitterMentionsClient,
} from "../twitter-api/api/get-user-mentions";
import { TaskRepository } from "../db/repositories/taskRepository";
import { getCredentials } from "../lib/utils";
import type { Env } from "../types";

/**
 * Scheduled task: Get Twitter mentions and create processing tasks
 */
export async function getUserMentionsScheduled(env: Env): Promise<void> {
  console.log("Checking for new twitter mentions...");

  try {
    // Get API credentials
    const credentials = await getCredentials(env);
    if (!credentials) {
      throw new Error("Failed to get Twitter API credentials");
    }

    const { bearerToken, userId } = credentials;

    // Set up API client
    const mentionsClient = new TwitterMentionsClient(bearerToken);

    // Get mentions
    const options: GetMentionsOptions = {
      maxResults: 1,
    };

    const lastMentionId = await env.KV.get("last_mention_id");
    if (lastMentionId) {
      options.sinceId = lastMentionId;
    }

    const mentions = await mentionsClient.getUserMentions(userId, options);

    if (!mentions.data || mentions.data.length === 0) {
      console.log("No new mentions found");
      return;
    }

    console.log(`Found ${mentions.data.length} new mentions`);

    // Create task repository
    const taskRepo = new TaskRepository(env);

    // Create tasks and add to queue for each mention
    let newestMentionId = lastMentionId || "0";
    for (const mention of mentions.data) {
      // Update newest mention ID
      if (BigInt(mention.id) > BigInt(newestMentionId)) {
        newestMentionId = mention.id;
      }

      // Check if it's a reply to a tweet
      // Due to API limitations, we may not be able to get referenced_tweets
      // This is a simple handling, in the future we can get it through additional API calls
      const task = await taskRepo.createTask(mention.id, mention.id);
      console.log(`Created task ${task.id} for mention ${mention.id}`);

      // Process task using Workflow
      await env.MY_TWITTER_WORKFLOW.create({
        id: task.id + "-" + Math.random().toString(36).substring(2, 4), // Add random string
        params: {
          taskId: task.id,
        },
      });
      console.log(`Task ${task.id} added to queue`);
    }

    // Store the newest mention ID for next request
    if (newestMentionId !== lastMentionId) {
      await env.KV.put("last_mention_id", newestMentionId);
      console.log(`Updated last_mention_id to ${newestMentionId}`);
    }
  } catch (error) {
    console.error("Error fetching Twitter mentions:", error);
  }
}
