import { refreshTwitterToken } from "./refresh-token.js";
import { Logger, LogLevel } from "../common/logger.js";

// Configuration
const REFRESH_TOKEN = process.env.TWITTER_REFRESH_TOKEN || "";
const CLIENT_ID = process.env.TWITTER_CLIENT_ID || "";
const CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET || "";

/**
 * Test the Twitter token refresh functionality
 */
async function runRefreshTokenTest() {
  // Create logger
  const logger = new Logger({
    logLevel: LogLevel.DEBUG,
  });

  logger.info("RefreshTokenTest", "Starting token refresh test");

  // Check for required environment variables
  if (!REFRESH_TOKEN) {
    logger.error(
      "RefreshTokenTest",
      "TWITTER_REFRESH_TOKEN environment variable is not set"
    );
    console.error(
      "Error: TWITTER_REFRESH_TOKEN environment variable is not set."
    );
    console.log("Please set the environment variables and try again:");
    console.log('export TWITTER_REFRESH_TOKEN="your_refresh_token_here"');
    process.exit(1);
  }

  if (!CLIENT_ID) {
    logger.error(
      "RefreshTokenTest",
      "TWITTER_CLIENT_ID environment variable is not set"
    );
    console.error("Error: TWITTER_CLIENT_ID environment variable is not set.");
    console.log('export TWITTER_CLIENT_ID="your_client_id_here"');
    process.exit(1);
  }

  if (!CLIENT_SECRET) {
    logger.error(
      "RefreshTokenTest",
      "TWITTER_CLIENT_SECRET environment variable is not set"
    );
    console.error(
      "Error: TWITTER_CLIENT_SECRET environment variable is not set."
    );
    console.log('export TWITTER_CLIENT_SECRET="your_client_secret_here"');
    process.exit(1);
  }

  logger.info("RefreshTokenTest", "Starting Twitter token refresh test");
  console.log("Starting Twitter token refresh test...");

  try {
    // Refresh the token
    const startTime = Date.now();
    const tokenResponse = await refreshTwitterToken(
      REFRESH_TOKEN,
      CLIENT_ID,
      CLIENT_SECRET
    );
    const duration = Date.now() - startTime;

    logger.info("RefreshTokenTest", "Token refreshed successfully", {
      tokenType: tokenResponse.token_type,
      expiresIn: tokenResponse.expires_in,
      scope: tokenResponse.scope,
      hasNewRefreshToken: !!tokenResponse.refresh_token,
      duration,
    });

    console.log(`✅ Token refreshed successfully!`);
    console.log(`Token type: ${tokenResponse.token_type}`);
    console.log(`Expires in: ${tokenResponse.expires_in} seconds`);
    console.log(`Scope: ${tokenResponse.scope}`);

    // Only show partial token for security
    const accessTokenPreview =
      tokenResponse.access_token.substring(0, 10) + "...";
    console.log(`Access token (partial): ${accessTokenPreview}`);

    if (tokenResponse.refresh_token) {
      console.log("✅ New refresh token received");
    }

    console.log(`Refresh took ${duration}ms`);

    return tokenResponse;
  } catch (error) {
    logger.error("RefreshTokenTest", "Token refresh failed", error);
    console.error("❌ Token refresh failed:", error);
    process.exit(1);
  }
}

// Check if this file is being executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runRefreshTokenTest().catch(console.error);
}

export { runRefreshTokenTest };
