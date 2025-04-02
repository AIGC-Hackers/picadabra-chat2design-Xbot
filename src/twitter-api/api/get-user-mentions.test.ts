import { TwitterMentionsClient } from "./get-user-mentions.js";
import { Logger, LogLevel } from "../common/logger.js";

// Configuration
const BEARER_TOKEN = process.env.TWITTER_ACCESS_TOKEN || "";
const USER_ID = process.env.TWITTER_USER_ID || "";

/**
 * Test the Twitter user mentions functionality
 */
async function runUserMentionsTest() {
  // Create logger
  const logger = new Logger({
    logLevel: LogLevel.DEBUG,
  });

  logger.info("MentionsTest", "Starting user mentions retrieval test");

  if (!BEARER_TOKEN) {
    logger.error(
      "MentionsTest",
      "TWITTER_ACCESS_TOKEN environment variable is not set"
    );
    console.error(
      "Error: TWITTER_ACCESS_TOKEN environment variable is not set."
    );
    console.log("Please set the environment variable and try again:");
    console.log('export TWITTER_ACCESS_TOKEN="your_bearer_token_here"');
    process.exit(1);
  }

  if (!USER_ID) {
    logger.error(
      "MentionsTest",
      "TWITTER_USER_ID environment variable is not set"
    );
    console.error("Error: TWITTER_USER_ID environment variable is not set.");
    console.log("Please set the environment variable and try again:");
    console.log('export TWITTER_USER_ID="your_user_id_here"');
    process.exit(1);
  }

  logger.info("MentionsTest", "Starting Twitter user mentions retrieval test");
  console.log("Starting Twitter user mentions retrieval test...");

  try {
    const mentionsClient = new TwitterMentionsClient(BEARER_TOKEN, logger);

    logger.info("MentionsTest", `Getting mentions for user: ${USER_ID}`);
    console.log(`Retrieving mentions for user ID: ${USER_ID}`);

    // Retrieve user mentions
    const startTime = Date.now();
    const mentionsResponse = await mentionsClient.getUserMentions(USER_ID, {
      maxResults: 10,
    });
    const duration = Date.now() - startTime;

    logger.info("MentionsTest", "User mentions retrieved successfully", {
      count: mentionsResponse.data.length,
      meta: mentionsResponse.meta,
      duration,
    });

    console.log(`✅ User mentions retrieved successfully!`);
    console.log(`Found ${mentionsResponse.data.length} mentions`);
    console.log(`Newest ID: ${mentionsResponse.meta.newest_id}`);
    console.log(`Oldest ID: ${mentionsResponse.meta.oldest_id}`);

    // Display first 3 mentions
    const mentionsToShow = Math.min(3, mentionsResponse.data.length);
    if (mentionsToShow > 0) {
      console.log("\nMost recent mentions:");
      for (let i = 0; i < mentionsToShow; i++) {
        const mention = mentionsResponse.data[i];
        console.log(`\n${i + 1}. ID: ${mention.id}`);
        console.log(`   Text: ${mention.text}`);
      }
    }

    console.log(`\nRetrieval took ${duration}ms`);

    return mentionsResponse;
  } catch (error) {
    logger.error("MentionsTest", "User mentions retrieval failed", error);
    console.error("❌ User mentions retrieval failed:", error);
    process.exit(1);
  }
}

// Check if this file is being executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runUserMentionsTest().catch(console.error);
}

export { runUserMentionsTest };
