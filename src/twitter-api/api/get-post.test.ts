import { TwitterPostReader } from "./get-post.js";
import { Logger, LogLevel } from "../common/logger.js";

// Configuration
const BEARER_TOKEN = process.env.TWITTER_BEAR_TOKEN || "";

/**
 * Test the Twitter post retrieval functionality
 */
async function runGetPostTest() {
  // Create logger
  const logger = new Logger({
    logLevel: LogLevel.DEBUG,
  });

  logger.info("PostReaderTest", "Starting post retrieval test");

  if (!BEARER_TOKEN) {
    logger.error(
      "PostReaderTest",
      "TWITTER_ACCESS_TOKEN environment variable is not set"
    );
    console.error(
      "Error: TWITTER_ACCESS_TOKEN environment variable is not set."
    );
    console.log("Please set the environment variable and try again:");
    console.log('export TWITTER_ACCESS_TOKEN="your_bearer_token_here"');
    process.exit(1);
  }

  logger.info("PostReaderTest", "Starting Twitter post retrieval test");
  console.log("Starting Twitter post retrieval test...");

  try {
    const postReader = new TwitterPostReader(BEARER_TOKEN, logger);

    // const postId = "1906001691784405458";
    const postId = "1907322561098338468";
    logger.info("PostReaderTest", `Getting post details for ID: ${postId}`);
    console.log(`Retrieving post details for ID: ${postId}`);

    // Retrieve post information
    const startTime = Date.now();
    const postResponse = await postReader.getPost(postId);
    const duration = Date.now() - startTime;

    logger.info("PostReaderTest", "Post information retrieved successfully", {
      postId: postResponse.data.id,
      textLength: postResponse.data.text.length,
      hasMedia: !!postResponse.includes?.media?.length,
      duration,
    });

    console.log(`✅ Post information retrieved successfully!`);
    console.log(`Post ID: ${postResponse.data.id}`);
    console.log(`Text: ${postResponse.data.text}`);

    // Display media information
    if (postResponse.includes && postResponse.includes.media) {
      console.log(
        `\nMedia information (${postResponse.includes.media.length} items):`
      );
      postResponse.includes.media.forEach((media, index) => {
        console.log(`\nMedia ${index + 1}:`);
        console.log(`- Type: ${media.type}`);
        console.log(`- URL: ${media.url || media.preview_image_url || "N/A"}`);
        if (media.width && media.height) {
          console.log(`- Dimensions: ${media.width}x${media.height}`);
        }
      });
    }

    console.log(`\nRetrieval took ${duration}ms`);

    return postResponse;
  } catch (error) {
    logger.error("PostReaderTest", "Post retrieval failed", error);
    console.error("❌ Post retrieval failed:", error);
    process.exit(1);
  }
}

// Check if this file is being executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runGetPostTest().catch(console.error);
}

export { runGetPostTest };
