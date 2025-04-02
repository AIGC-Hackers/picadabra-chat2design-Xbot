import { TwitterUserClient } from "./get-user.js";
import { Logger, LogLevel } from "../common/logger.js";

// Configuration
const BEARER_TOKEN = process.env.TWITTER_ACCESS_TOKEN || "";

/**
 * Test the Twitter user retrieval functionality
 */
async function runUserTest() {
  // Create logger
  const logger = new Logger({
    logLevel: LogLevel.DEBUG,
  });

  logger.info("UserTest", "Starting user retrieval test");

  if (!BEARER_TOKEN) {
    logger.error(
      "UserTest",
      "TWITTER_ACCESS_TOKEN environment variable is not set"
    );
    console.error(
      "Error: TWITTER_ACCESS_TOKEN environment variable is not set."
    );
    console.log("Please set the environment variable and try again:");
    console.log('export TWITTER_ACCESS_TOKEN="your_bearer_token_here"');
    process.exit(1);
  }

  logger.info("UserTest", "Starting Twitter user retrieval test");
  console.log("Starting Twitter user retrieval test...");

  try {
    const userClient = new TwitterUserClient(BEARER_TOKEN, logger);

    const username = "picadabra";
    logger.info("UserTest", `Getting information for user: ${username}`);
    console.log(`Retrieving information for user: ${username}`);

    // Retrieve user information
    const startTime = Date.now();
    const userResponse = await userClient.getUserByUsername(username);
    const duration = Date.now() - startTime;

    logger.info("UserTest", "User information retrieved successfully", {
      userId: userResponse.data.id,
      username: userResponse.data.username,
      duration,
    });

    console.log(`✅ User information retrieved successfully!`);
    console.log(`User ID: ${userResponse.data.id}`);
    console.log(`Username: ${userResponse.data.username}`);
    console.log(`Name: ${userResponse.data.name}`);
    console.log(`Retrieval took ${duration}ms`);

    return userResponse;
  } catch (error) {
    logger.error("UserTest", "User retrieval failed", error);
    console.error("❌ User retrieval failed:", error);
    process.exit(1);
  }
}

// Check if this file is being executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runUserTest().catch(console.error);
}

export { runUserTest };
