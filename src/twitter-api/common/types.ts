/**
 * Twitter API OAuth 2.0 related type definitions
 */

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
}

export interface AuthOptions {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes?: string[];
}
