import { ENDPOINTS } from "../common/config.js";
import { TokenResponse } from "../common/types.js";

/**
 * Refresh Twitter API access token
 * @param refreshToken Refresh token
 * @param clientId Client ID
 * @param clientSecret Client secret
 * @returns Token response data
 */
export async function refreshTwitterToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<TokenResponse> {
  try {
    const tokenUrl = ENDPOINTS.TOKEN;

    // Build request body
    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", refreshToken);

    // Build Basic Auth header
    const basicAuth = btoa(
      `${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`
    );

    // Send request
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: params.toString(),
    });

    // Process response
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
    }

    return (await response.json()) as TokenResponse;
  } catch (error) {
    console.error("Token refresh failed:", error);
    throw error;
  }
}
