import path from "path";
import fs from "fs";
import { TwitterMediaUploader } from "./media-upload.js";
import { Logger, LogLevel } from "../common/logger.js";

// Configuration
const BEARER_TOKEN = process.env.TWITTER_ACCESS_TOKEN || "";
const TEST_IMAGE_PATH = path.join(__dirname, "img/test-image.png");

/**
 * Test the Twitter media upload functionality
 */
async function runMediaUploadTest() {
  // Create logger
  const logger = new Logger({
    logLevel: LogLevel.DEBUG,
  });

  logger.info("MediaUploadTest", "Starting media upload test");

  if (!BEARER_TOKEN) {
    logger.error(
      "MediaUploadTest",
      "TWITTER_BEARER_TOKEN environment variable is not set"
    );
    console.error(
      "Error: TWITTER_BEARER_TOKEN environment variable is not set."
    );
    console.log("Please set the environment variable and try again:");
    console.log('export TWITTER_BEARER_TOKEN="your_bearer_token_here"');
    process.exit(1);
  }

  // Verify the test image exists
  if (!fs.existsSync(TEST_IMAGE_PATH)) {
    logger.error("MediaUploadTest", "Test image does not exist", {
      path: TEST_IMAGE_PATH,
    });
    console.error("Error: Test image does not exist at:", TEST_IMAGE_PATH);
    process.exit(1);
  }

  logger.info("MediaUploadTest", "Starting Twitter media upload test");
  console.log("Starting Twitter media upload test...");

  try {
    const uploader = new TwitterMediaUploader({
      bearerToken: BEARER_TOKEN,
      mediaType: "image/png",
      mediaCategory: "tweet_image",
      logger,
    });

    // Get file info for logging
    const stats = fs.statSync(TEST_IMAGE_PATH);
    logger.info("MediaUploadTest", "Uploading image", {
      path: TEST_IMAGE_PATH,
      size: stats.size,
    });
    console.log(`Uploading image: ${TEST_IMAGE_PATH} (${stats.size} bytes)`);
    const fileBuffer = fs.readFileSync(TEST_IMAGE_PATH);

    // Upload the media
    const startTime = Date.now();
    const mediaId = await uploader.uploadMedia(
      Buffer.from(fileBuffer),
      "image/png",
      "tweet_image"
    );
    const duration = Date.now() - startTime;

    logger.info("MediaUploadTest", "Media upload successful", {
      mediaId,
      duration,
    });
    console.log(`✅ Media upload successful!`);
    console.log(`Media ID: ${mediaId}`);
    console.log(`Upload took ${duration}ms`);

    // Optional: Get media upload status
    // logger.info("MediaUploadTest", "Getting media upload status", { mediaId });
    // const status = await uploader.getMediaUploadStatus(mediaId);
    // logger.info("MediaUploadTest", "Media status received", { status });
    // console.log("status", status);

    return mediaId;
  } catch (error) {
    logger.error("MediaUploadTest", "Media upload failed", error);
    console.error("❌ Media upload failed:", error);
    process.exit(1);
  }
}

// Check if this file is being executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runMediaUploadTest().catch(console.error);
}

export { runMediaUploadTest };
