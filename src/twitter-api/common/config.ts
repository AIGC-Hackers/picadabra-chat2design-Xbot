/**
 * Twitter API OAuth 2.0 Configuration
 *
 * Please modify the following configuration information before use
 */

import { AuthOptions } from "./types.js";

// Default configuration
export const config: AuthOptions = {
  clientId: process.env.TWITTER_CLIENT_ID ?? "", // Get from X Developer Portal
  clientSecret: process.env.TWITTER_CLIENT_SECRET ?? "", // Get from X Developer Portal
  redirectUri: "http://localhost:3000/callback", // Must exactly match what is set in the X Developer Portal
  scopes: [
    "tweet.read",
    "tweet.write",
    "users.read",
    "offline.access",
    "media.write",
  ], // Adjust permission scope as needed
};

// Server configuration
export const SERVER_PORT = 3000; // Local callback server port

// API endpoints
export const ENDPOINTS = {
  AUTHORIZE: "https://twitter.com/i/oauth2/authorize",
  TOKEN: "https://api.twitter.com/2/oauth2/token",
};
