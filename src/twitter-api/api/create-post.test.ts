import { TwitterPostClient } from "./create-post.js";
import { Logger, LogLevel } from "../common/logger.js";

// Configuration
const BEARER_TOKEN = process.env.TWITTER_ACCESS_TOKEN || "";

/**
 * Test the Twitter post creation functionality
 */
async function runCreatePostTest() {
  // Create logger
  const logger = new Logger({
    logLevel: LogLevel.DEBUG,
  });

  logger.info("PostTest", "Starting post creation test");

  if (!BEARER_TOKEN) {
    logger.error(
      "PostTest",
      "TWITTER_ACCESS_TOKEN environment variable is not set"
    );
    console.error(
      "Error: TWITTER_ACCESS_TOKEN environment variable is not set."
    );
    console.log("Please set the environment variable and try again:");
    console.log('export TWITTER_ACCESS_TOKEN="your_bearer_token_here"');
    process.exit(1);
  }

  logger.info("PostTest", "Starting Twitter post creation test");
  console.log("Starting Twitter post creation test...");

  try {
    const postClient = new TwitterPostClient(BEARER_TOKEN, logger);

    // Reply example
    const replyData = {
      text: "Hello nice to meet you!",
      for_super_followers_only: false,
      nullcast: false,
      media: {
        tagged_user_ids: [],
        media_ids: ["1905922908343742464"],
      },
      reply: {
        in_reply_to_tweet_id: "1905908002903020004",
      },
    };

    logger.info("PostTest", "Creating reply to tweet", {
      replyTo: replyData.reply.in_reply_to_tweet_id,
    });
    console.log(
      `Creating reply to tweet: ${replyData.reply.in_reply_to_tweet_id}`
    );

    // Create the post
    const startTime = Date.now();
    const response = await postClient.createPost(replyData);
    const duration = Date.now() - startTime;

    logger.info("PostTest", "Post created successfully", {
      postId: response.data.id,
      text: response.data.text,
      duration,
    });

    console.log(`✅ Post created successfully!`);
    console.log(`Post ID: ${response.data.id}`);
    console.log(`Text: ${response.data.text}`);
    console.log(`Creation took ${duration}ms`);

    return response;
  } catch (error) {
    logger.error("PostTest", "Post creation failed", error);
    console.error("❌ Post creation failed:", error);
    process.exit(1);
  }
}

// Check if this file is being executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runCreatePostTest().catch(console.error);
}

export { runCreatePostTest };
