import type { Env } from "../types";
import { refreshTwitterToken } from "../twitter-api/api/refresh-token";

const KEYS = {
  TWITTER_REFRESH_TOKEN: "TWITTER_REFRESH_TOKEN",
  TWITTER_ACCESS_TOKEN: "TWITTER_ACCESS_TOKEN",
};

/**
 * Process scheduled task for refreshing Twitter token
 * @param env Environment variables
 */
export async function refreshTwitterTokenScheduled(env: Env): Promise<void> {
  try {
    console.log("Starting Twitter token refresh...");

    // Get credentials required for refresh from environment variables or KV
    const refreshToken =
      (await env.KV.get(KEYS.TWITTER_REFRESH_TOKEN)) ||
      env.TWITTER_REFRESH_TOKEN;

    // Client ID and secret should be obtained from environment variables
    const clientId = env.TWITTER_CLIENT_ID || "";
    const clientSecret = env.TWITTER_CLIENT_SECRET || "";

    if (!refreshToken || !clientId || !clientSecret) {
      console.error("Missing credentials required for token refresh");
      return;
    }

    // Refresh token
    const tokenData = await refreshTwitterToken(
      refreshToken,
      clientId,
      clientSecret
    );

    // Store new access token in KV and set appropriate expiration time
    await env.KV.put(KEYS.TWITTER_ACCESS_TOKEN, tokenData.access_token, {
      expirationTtl: tokenData.expires_in - 30, // Store for slightly less than its lifetime
    });

    // If a new refresh token was received, update it as well
    if (tokenData.refresh_token && tokenData.refresh_token !== refreshToken) {
      console.log("Received new refresh token, updating...");
      await env.KV.put(KEYS.TWITTER_REFRESH_TOKEN, tokenData.refresh_token);
    }

    console.log("Successfully refreshed Twitter API token");
  } catch (error) {
    console.error("Token refresh failed:", error);
  }
}
