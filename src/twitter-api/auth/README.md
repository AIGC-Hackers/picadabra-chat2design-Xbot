# X API OAuth 2.0 Authorization Script Toolkit

This toolkit provides a set of TypeScript scripts to help you complete the X (Twitter) API OAuth 2.0 authorization flow, especially using the Authorization Code Flow with PKCE (Proof Key for Code Exchange) method.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [OAuth 2.0 Authorization Flow Overview](#oauth-20-authorization-flow-overview)
- [Script Description](#script-description)
- [Usage Steps](#usage-steps)
  - [All-in-One Tool (Recommended)](#all-in-one-tool-recommended)
  - [Individual Scripts](#individual-scripts)
- [Security Recommendations](#security-recommendations)
- [FAQ](#faq)

## Prerequisites

1. Have already created an application on the [X Developer Platform](https://developer.x.com/)
2. Have configured OAuth 2.0 settings for the application:
   - Set appropriate permission scopes (such as `tweet.read`, `tweet.write`, `users.read`, `offline.access`)
   - Set callback URL (typically `http://localhost:3000/callback` for local testing)
3. Have obtained the application's Client ID and Client Secret
4. Installed Node.js (v18.0.0 or higher)

## Installation

1. Install dependencies:

```bash
pnpm install
```

2. Configure your application information in the `src/config.ts` file:

```typescript
export const config: AuthOptions = {
  clientId: "YOUR_CLIENT_ID", // Get from X Developer Portal
  clientSecret: "YOUR_CLIENT_SECRET", // Get from X Developer Portal
  redirectUri: "http://localhost:3000/callback", // Must exactly match what is set in the X Developer Portal
  scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"], // Adjust permission scope as needed
};
```

3. Build the project:

```bash
npm run build
```

## OAuth 2.0 Authorization Flow Overview

The X API OAuth 2.0 authorization flow consists of the following steps:

1. **Generate Authorization URL**: Create an authorization URL containing PKCE code_challenge
2. **User Authorization**: User visits the authorization URL and agrees to grant application permissions
3. **Receive Authorization Code**: X redirects the user to the callback URL with an authorization code
4. **Exchange Access Token**: Exchange the authorization code and code_verifier for access and refresh tokens
5. **Use Access Token**: Use the access token in API requests
6. **Refresh Token**: When the access token expires, use the refresh token to get a new access token

## Script Description

This toolkit includes the following scripts:

1. **`generate-auth-url.ts`**: Generates an authorization URL and outputs code_verifier for later use
2. **`setup-local-callback-server.ts`**: Starts a local server to receive authorization callbacks and display the authorization code
3. **`exchange-token.ts`**: Uses authorization code and code_verifier to exchange for access and refresh tokens
4. **`refresh-token.ts`**: Uses refresh token to get a new access token

Additionally, we provide an all-in-one tool:

5. **All-in-One Authorization Tool**: Integrates the complete OAuth flow in a single web interface, including generating authorization URL, receiving callbacks, exchanging tokens, and refreshing tokens

## Usage Steps

### All-in-One Tool (Recommended)

Using the all-in-one tool allows you to complete the entire OAuth flow in a single web interface:

1. Ensure you have configured `clientId`, `clientSecret`, and `redirectUri` in `src/config.ts`
2. Run:

```bash
npm run all-in-one
```

This will start a local server, default port is 3000. If you need to use another port:

```bash
npm run all-in-one -- 8080
```

3. Visit http://localhost:3000/ (or your specified port) in your browser
4. Follow the steps on the page:
   - Step One: Generate authorization URL and open in a new window
   - Step Two: Exchange authorization code and code_verifier for access token
   - Step Three: Use refresh token to get a new access token

Advantages of the all-in-one tool:

- Automatically saves and passes code_verifier
- Automatically redirects back to the tool page after authorization and fills in the authorization code
- User-friendly interface, clear process
- No need to manually copy parameters between multiple scripts

### Individual Scripts

If you prefer to use individual scripts, you can follow these steps:

#### 1. Generate Authorization URL

First ensure you have configured the correct `clientId` and `redirectUri` in `src/config.ts`, then run:

```bash
npm run generate-auth-url
```

The script will output the authorization URL and code_verifier, be sure to save the code_verifier for later use.

#### 2. Start Local Callback Server

In a new terminal window, run:

```bash
npm run callback-server
```

This will start a local server listening on port 3000, ready to receive authorization callbacks. If you need to use another port:

```bash
npm run callback-server -- 8080
```

#### 3. Complete User Authorization

Open the authorization URL generated in step one in your browser, log in with your X account and authorize the application.

After authorization, X will redirect you back to the local server, which will display the authorization code and output the next command in the console.

#### 4. Exchange for Access Token

Ensure you have configured `clientId` and `clientSecret` in `src/config.ts`, then run using the authorization code and the previously saved code_verifier:

```bash
npm run exchange-token -- <authorization_code> <code_verifier>
```

The script will output access token, refresh token, and other information. Please keep these tokens safe.

#### 5. Refresh When Access Token Expires

Access tokens typically expire after 2 hours. When you need to get a new access token, run using the refresh token:

```bash
npm run refresh-token -- <refresh_token>
```

The script will output a new access token and possibly an updated refresh token.

## Security Recommendations

1. **Never** commit Client Secret or any tokens to version control systems
2. In production environments, use environment variables or secure key management systems to store sensitive information
3. Use different application credentials for different environments (development, testing, production)
4. Regularly review authorized applications, revoke authorizations no longer in use
5. Follow the principle of least privilege when handling tokens

## FAQ

### Authorization URL Invalid or Returns Error

- Ensure clientId is correct
- Check if redirectUri exactly matches what's in the X Developer Portal
- Verify the requested permission scopes are enabled in the application settings

### Token Exchange Fails

- Ensure the authorization code is used only once and hasn't expired (typically valid for 10 minutes)
- Verify code_verifier is the same as the one used when generating the authorization URL
- Check if clientSecret is correct

### Refresh Token Fails

- Ensure the refresh token hasn't expired or been revoked
- Verify clientId and clientSecret are correct
- If failures persist, you may need to go through the complete authorization flow again

### TypeScript Build Errors

- Ensure all dependencies are installed `npm install`
- Check if TypeScript version is compatible with `tsconfig.json` configuration
- Run `npm run build` to see detailed error information

---

For any questions or suggestions, please refer to the [X API Documentation](https://developer.x.com/docs) or create an issue.
