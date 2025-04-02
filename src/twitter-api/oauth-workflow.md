# Implementing OAuth 2.0 User Context for X API v2

Let's explain in detail how to implement **OAuth 2.0 User Context** for X API v2, especially the **Authorization Code Grant with PKCE (Proof Key for Code Exchange)** flow recommended for public clients (such as your Cloudflare Worker backend or a frontend setup process working with it).

This flow allows your application (your bot service) to perform actions (like tweeting, replying) on behalf of a user (in this case, your bot's X account) after obtaining explicit authorization from the user. PKCE adds an extra layer of security, making it possible to securely perform authorization even in environments where the client secret cannot be securely stored.

**Core Concepts:**

1. **User Authorization:** Your application needs to guide the user (the bot account owner) to X's authorization page to log in and agree to grant authorization.
2. **Authorization Code:** After the user agrees, X will redirect the user back to a predetermined URL in your application, with a one-time authorization code.
3. **Token Exchange:** Your application backend (or setup script) uses this authorization code, along with a previously generated verification code (part of PKCE), to request an Access Token and Refresh Token from X's token endpoint.
4. **API Calls:** Use the obtained Access Token to call APIs that require user context (e.g., `POST /2/tweets`).
5. **Token Refresh:** Access tokens have an expiration time; after expiration, you need to use the Refresh Token to obtain a new Access Token without requiring the user to authorize again.

**Implementation Steps (Authorization Code Grant with PKCE):**

**Phase One: Application Setup (in X Developer Portal)**

1. **Create or Configure App:** In the X Developer Portal, go to your App settings.
2. **Enable OAuth 2.0:** Find the "User authentication settings" or similar section, click "Set up".
3. **Select App Permissions:** You need at least `tweet.read`, `tweet.write`, `users.read`. If you want to be able to automatically refresh tokens for a long time without requiring the user to log in again, be sure to check `offline.access` (this will give you a Refresh Token in step 6).
4. **Select Type of App:** Choosing "Public client" is usually appropriate for this scenario, as it doesn't rely on securely storing a Client Secret for core token exchange (PKCE handles this). Web App or Native App options may also work, the key is to implement the PKCE flow.
5. **Configure Callback URI / Redirect URL:**
   - **Extremely Important:** Set a URL that your application can control. After the user authorizes on X, the browser will be redirected to this URL.
   - **For Worker setup:** This is typically _not_ your Worker's main URL. More commonly, you would use a temporary local server address (like `http://localhost:3000/callback`) or a page on a simple static web hosting service during a **one-time setup process** to receive this callback and complete the token exchange. The goal of this setup process is to obtain the initial Access Token and Refresh Token, then securely store them for the Worker to use.
   - Make sure the URL set here **exactly matches** the `redirect_uri` parameter you use when building the authorization URL in step 2.
6. **Record Client ID:** Note down your App's Client ID. For the PKCE flow, you theoretically don't need a Client Secret to exchange tokens, but the X Developer Portal may still provide one; record it for future use (for example, some token refresh operations may still require client authentication in the form of Basic Auth).

**Phase Two: Obtain User Authorization and Exchange Tokens (typically a one-time setup process)**

This process requires an environment that can interact with a browser to initiate the authorization flow, and a backend (or script) to handle callbacks and token exchange.

1. **Generate Code Verifier and Code Challenge (client/initiating side):**

   - **Code Verifier:** Create a sufficiently long and random string (e.g., a 128-byte random number encoded in Base64). `[A-Za-z0-9-._~]{43,128}`
   - **Code Challenge:** Perform a SHA-256 hash operation on the Code Verifier, then Base64URL encode the result (note: not standard Base64, but the URL-safe version).
   - **Store Code Verifier:** You need to temporarily store the `code_verifier`, as you'll need it for token exchange in step 5. If this flow is initiated in a browser, it can be stored in Session Storage; if it's a script, save it in a variable.

   ```javascript
   // Example (Node.js or environment supporting Web Crypto API)
   async function generatePKCECodes() {
     const verifier = generateRandomString(128); // Generate random string
     const encoder = new TextEncoder();
     const data = encoder.encode(verifier);
     const digest = await crypto.subtle.digest("SHA-256", data);

     // Base64URL encode
     const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
     const challenge = base64
       .replace(/\+/g, "-")
       .replace(/\//g, "_")
       .replace(/=+$/, "");

     return { verifier, challenge };
   }

   function generateRandomString(length) {
     // Implement a secure random string generator
     // ... (e.g., using crypto.randomBytes in Node or crypto.getRandomValues in browser)
     // Return a string that complies with PKCE specs
     let result = "";
     const characters =
       "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
     const charactersLength = characters.length;
     // Ensure using cryptographically secure random values
     const randomValues = new Uint8Array(length);
     crypto.getRandomValues(randomValues);
     for (let i = 0; i < length; i++) {
       result += characters.charAt(
         Math.floor((randomValues[i] / 256) * charactersLength)
       );
     }
     // Ensure length constraints (43-128)
     return result.substring(0, Math.max(43, Math.min(length, 128)));
   }

   // Usage:
   // const { verifier, challenge } = await generatePKCECodes();
   // // Store verifier
   // // Use challenge to build authorization URL
   ```

2. **Build Authorization URL (client/initiating side):**
   Create a URL pointing to X's authorization endpoint, including the following query parameters:

   - `response_type=code`
   - `client_id`: Your App Client ID (from Phase One)
   - `redirect_uri`: The Callback URL you configured in Phase One and are using here
   - `scope`: The permissions you need, separated by spaces (e.g., `tweet.read tweet.write users.read offline.access`)
   - `state`: A randomly generated, unpredictable string, used to prevent CSRF attacks. You need to temporarily store it and verify it in step 4.
   - `code_challenge`: The Code Challenge generated in step 1.
   - `code_challenge_method=S256`: Informs X that you used the SHA-256 hash algorithm.

   ```
   https://twitter.com/i/oauth2/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_CALLBACK_URI&scope=tweet.read%20tweet.write%20users.read%20offline.access&state=RANDOM_STATE_STRING&code_challenge=GENERATED_CODE_CHALLENGE&code_challenge_method=S256
   ```

3. **Redirect User (client/initiating side):**
   Redirect the user's (bot account owner's) browser to the authorization URL built above. The user needs to log in to X (if not already logged in) and explicitly authorize your application to access their account.

4. **Process Callback (on your `redirect_uri` corresponding service/page):**

   - User authorization is complete, X will redirect the user's browser back to your `redirect_uri`, with the following URL query parameters:
   - `code`: Authorization code.
   - `state`: The `state` value you sent in step 2.
   - **Verify `state`:** Check if the received `state` value matches the `state` value you stored in step 2. If it doesn't match, it could be a CSRF attack, and you should stop the process.
   - **Extract `code`:** Get the authorization code `code`.

5. **Exchange Authorization Code for Tokens (backend/callback processing side):**

   - Your backend service (or script) receives `code` and immediately sends a `POST` request to X's token endpoint (`https://api.twitter.com/2/oauth2/token`).
   - Request Header: `Content-Type: application/x-www-form-urlencoded`
   - Request Body (form-urlencoded):
   - `grant_type=authorization_code`
   - `code`: The authorization code obtained in step 4.
   - `client_id`: Your App Client ID.
   - `redirect_uri`: **Must** be exactly the same as the `redirect_uri` you used in step 2.
   - `code_verifier`: The original Code Verifier you generated and **stored** in step 1.

   ```javascript
   // Example (using fetch API)
   async function exchangeCodeForTokens(code, verifier, clientId, redirectUri) {
     const tokenUrl = "https://api.twitter.com/2/oauth2/token";
     const params = new URLSearchParams();
     params.append("grant_type", "authorization_code");
     params.append("code", code);
     params.append("client_id", clientId);
     params.append("redirect_uri", redirectUri);
     params.append("code_verifier", verifier);

     const response = await fetch(tokenUrl, {
       method: "POST",
       headers: {
         "Content-Type": "application/x-www-form-urlencoded",
         // X V2 PKCE token exchange typically does NOT require Basic Auth here,
         // as the code_verifier serves as the proof. Double-check X docs if issues arise.
       },
       body: params.toString(),
     });

     if (!response.ok) {
       const errorBody = await response.text();
       throw new Error(
         `Token exchange failed: ${response.status} ${errorBody}`
       );
     }

     const tokenData = await response.json();
     // tokenData will contain:
     // {
     //   "token_type": "bearer",
     //   "expires_in": 7200, // Seconds until access token expires
     //   "access_token": "ACCESS_TOKEN_STRING",
     //   "scope": "requested scopes",
     //   "refresh_token": "REFRESH_TOKEN_STRING" // Only if offline.access was requested and granted
     // }
     return tokenData;
   }

   // Usage:
   // try {
   //   const tokens = await exchangeCodeForTokens(receivedCode, storedVerifier, clientId, redirectUri);
   //   console.log("Access Token:", tokens.access_token);
   //   console.log("Refresh Token:", tokens.refresh_token);
   //   // Safely store tokens.access_token and tokens.refresh_token
   // } catch (error) {
   //   console.error("Error exchanging token:", error);
   // }
   ```

6. **Safely Store Tokens:**
   - **Extremely Important:** `access_token` and `refresh_token` are sensitive credentials.
   - Safely store them in a location your Cloudflare Worker can access. **Cloudflare Secrets are ideal for this**.
   - Use `wrangler secret put X_OAUTH2_ACCESS_TOKEN` and `wrangler secret put X_OAUTH2_REFRESH_TOKEN` commands to store them in the Worker's environment variables.
   - **Do not** hardcode them in your code or in the `[vars]` section of `wrangler.toml`.

**Phase Three: Use Access Token to Call API (in your Cloudflare Worker)**

1.  **Get Access Token:** In Worker code, read the Access Token from the environment variable `env.X_OAUTH2_ACCESS_TOKEN`.
2.  **Construct API Request:**

    - Include the Access Token in the `Authorization` Header of your request:
      `Authorization: Bearer <YOUR_ACCESS_TOKEN>`
    - For example, posting a reply:

      ```javascript
      const tweetText = "Hello from my bot!";
      const replyToTweetId = "ORIGINAL_TWEET_ID";
      const accessToken = env.X_OAUTH2_ACCESS_TOKEN; // Read from Secret

      const response = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: tweetText,
          reply: {
            in_reply_to_tweet_id: replyToTweetId,
          },
        }),
      });

      if (!response.ok) {
        // Handle error, possibly including expired token
        console.error(
          "API call failed:",
          response.status,
          await response.text()
        );
        // If 401 Unauthorized, you might need to refresh the token
      } else {
        const data = await response.json();
        console.log("Reply posted:", data);
      }
      ```

**Phase Four: Handle Token Refresh (in your Cloudflare Worker)**

Access tokens expire after a certain period (usually 2 hours). When an API call fails because the token is invalid (usually a 401 Unauthorized error), you need to use the Refresh Token to obtain a new Access Token without requiring the user to authorize again.

1. **Detect Expiration:** Catch the 401 error from the API call.
2. **Get Refresh Token:** Read the Refresh Token from the environment variable `env.X_OAUTH2_REFRESH_TOKEN`.
3. **Request New Token:** Send a `POST` request to X's token endpoint (`https://api.twitter.com/2/oauth2/token`).

   - Request Header:
   - `Content-Type: application/x-www-form-urlencoded`
   - **Possible Client Authentication:** X V2 Refresh Token flow typically requires client authentication. The most common method is **HTTP Basic Authentication**, using URL-encoded Client ID as the username and URL-encoded Client Secret as the password. Format: `Authorization: Basic <base64encode(urlencode(client_id):urlencode(client_secret))>`
   - **You need to securely store Client ID and Client Secret (also use Cloudflare Secrets)**
   - Request Body (form-urlencoded):
   - `grant_type=refresh_token`
   - `refresh_token`: The Refresh Token you stored.
   - `client_id`: Your Client ID (sometimes also needed in the body, depending on X's specific requirements, but usually Basic Auth is enough)

   ```javascript
   // Example (requires Client ID and Secret)
   async function refreshAccessToken(
     refreshToken,
     clientId,
     clientSecret,
     env
   ) {
     const tokenUrl = "https://api.twitter.com/2/oauth2/token";

     const params = new URLSearchParams();
     params.append("grant_type", "refresh_token");
     params.append("refresh_token", refreshToken);
     // params.append('client_id', clientId); // May be needed, check latest docs

     // Basic Auth Header
     const basicAuth = btoa(
       `${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`
     );

     const response = await fetch(tokenUrl, {
       method: "POST",
       headers: {
         "Content-Type": "application/x-www-form-urlencoded",
         Authorization: `Basic ${basicAuth}`,
       },
       body: params.toString(),
     });

     if (!response.ok) {
       const errorBody = await response.text();
       console.error(`Token refresh failed: ${response.status} ${errorBody}`);
       // If refresh fails (e.g., refresh token also expires), you need to re-initiate the user authorization flow
       throw new Error(`Token refresh failed: ${response.status} ${errorBody}`);
     }

     const tokenData = await response.json();
     // tokenData contains new access_token and possibly a new refresh_token

     // --- Update stored tokens ---
     // The most critical part: How to persist new tokens?
     // Option 1: Manual update (not scalable)
     // Option 2: Use Cloudflare API to update Secrets (Worker needs API Token, adds complexity)
     // Option 3: Store new Access Token in KV Store (Recommended)
     //    - Key: e.g., "X_OAUTH2_ACCESS_TOKEN"
     //    - Value: tokenData.access_token
     //    - TTL: tokenData.expires_in - 60 (slightly less than its lifetime)
     await env.YOUR_KV_NAMESPACE.put(
       "X_OAUTH2_ACCESS_TOKEN",
       tokenData.access_token,
       {
         expirationTtl: tokenData.expires_in - 60, // Store for slightly less than its lifetime
       }
     );

     // If a new refresh_token is returned, also update it (more complex, possibly needs API or manual)
     // In practice, Refresh Token might not change frequently. Prioritize storing and updating Access Token.
     if (tokenData.refresh_token && tokenData.refresh_token !== refreshToken) {
       console.warn(
         "New refresh token received. Manual update of X_OAUTH2_REFRESH_TOKEN secret might be needed."
       );
       // TODO: Implement strategy to update the refresh token secret if necessary and feasible.
       // For now, maybe just log it.
     }

     return tokenData.access_token; // Return new Access Token
   }

   // In Worker API call logic:
   async function makeApiCall(env) {
     let accessToken = await env.YOUR_KV_NAMESPACE.get("X_OAUTH2_ACCESS_TOKEN");
     if (!accessToken) {
       // KV has no or expired token, try getting initial/old one, or directly refresh
       const refreshToken = env.X_OAUTH2_REFRESH_TOKEN;
       const clientId = env.X_CLIENT_ID; // Read from Secret
       const clientSecret = env.X_CLIENT_SECRET; // Read from Secret
       if (refreshToken && clientId && clientSecret) {
         try {
           accessToken = await refreshAccessToken(
             refreshToken,
             clientId,
             clientSecret,
             env
           );
         } catch (refreshError) {
           console.error("Failed to refresh token:", refreshError);
           // Trigger alert or take other measures, as automatic recovery is not possible
           return; // Cannot continue
         }
       } else {
         console.error(
           "Missing refresh token or client credentials for refresh."
         );
         return; // Cannot continue
       }
     }

     try {
       // Use accessToken for API call...
       const response = await fetch("API_ENDPOINT", {
         headers: { Authorization: `Bearer ${accessToken}` },
       });
       if (response.status === 401) {
         // Even if from KV, it might be expired, try refresh
         console.log("Access token might be expired, attempting refresh...");
         const refreshToken = env.X_OAUTH2_REFRESH_TOKEN;
         const clientId = env.X_CLIENT_ID;
         const clientSecret = env.X_CLIENT_SECRET;
         accessToken = await refreshAccessToken(
           refreshToken,
           clientId,
           clientSecret,
           env
         );
         // Retry API call (only once)
         const retryResponse = await fetch("API_ENDPOINT", {
           headers: { Authorization: `Bearer ${accessToken}` },
         });
         if (!retryResponse.ok) {
           throw new Error(
             `API call failed after refresh: ${retryResponse.status}`
           );
         }
         // Handle refreshed successful response...
       } else if (!response.ok) {
         throw new Error(`API call failed: ${response.status}`);
       } else {
         // Handle successful response...
       }
     } catch (apiError) {
       console.error("Error during API call:", apiError);
     }
   }
   ```

4. **Update Stored Tokens:** This is the tricky part of the automated flow. As shown in the example code, we recommend using Cloudflare KV Store to store **Access Token** and setting a TTL for it. This way, the Worker can get a valid token from KV when needed, or trigger a refresh flow if the token is not found in KV. Updating **Refresh Token** is more challenging because it's usually stored in Secrets, and Worker doesn't have direct access to modify Secrets. If the Refresh Token changes, you might need to manually update the Secret, or set up a mechanism that has permission to call Cloudflare API to update it (this adds a lot of complexity). Fortunately, Refresh Token rarely changes.

**Summary:**

OAuth 2.0 User Context (PKCE) flow involves a one-time user interaction setup to get initial tokens, then securely store these tokens (especially Refresh Token) in Cloudflare Secrets. Your Worker code uses Access Token to call APIs and includes logic to detect token expiration, use Refresh Token to get new token (usually store new Access Token in KV), and handle potential refresh failure scenarios.
