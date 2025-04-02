#!/usr/bin/env node

/**
 * All-in-One X API OAuth 2.0 Authorization Tool
 *
 * This script integrates the complete OAuth flow:
 * - Generate authorization URL
 * - Receive authorization callback
 * - Exchange access token
 * - Refresh access token
 *
 * Usage instructions:
 * 1. Configure clientId and clientSecret in config.ts
 * 2. Run: npm run all-in-one [port]
 * 3. Visit http://localhost:{PORT}/ in your browser
 * 4. Follow the on-screen instructions to complete the OAuth authorization flow
 */

import * as http from "http";
import { parse } from "url";
import { SERVER_PORT, config, ENDPOINTS } from "../common/config.js";
import {
  generateRandomString,
  generateCodeChallenge,
  validateConfig,
} from "./utils.js";
import { TokenResponse } from "../common/types.js";

// Get port from command line arguments or use default
const PORT = process.argv[2] ? parseInt(process.argv[2], 10) : SERVER_PORT;

// Store code_verifier and state for later use
let codeVerifier = "";
let state = "";

// 存储用于会话的codeVerifier映射，使用state作为键
const codeVerifierMap = new Map<string, string>();

interface CallbackQuery {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

// Validate configuration
try {
  validateConfig({ clientId: config.clientId }, ["clientId"]);
} catch (error) {
  console.error("Configuration validation failed, please check config.ts file");
  process.exit(1);
}

/**
 * Generate authorization URL
 */
async function generateAuthUrl(): Promise<{
  url: string;
  verifier: string;
  state: string;
}> {
  // Generate code_verifier and state
  const codeVerifier = generateRandomString(128);
  const state = generateRandomString(32);

  // Generate code_challenge
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Build authorization URL
  const authUrl = new URL(ENDPOINTS.AUTHORIZE);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("client_id", config.clientId);
  authUrl.searchParams.append("redirect_uri", config.redirectUri);
  authUrl.searchParams.append("scope", (config.scopes || []).join(" "));
  authUrl.searchParams.append("state", state);
  authUrl.searchParams.append("code_challenge", codeChallenge);
  authUrl.searchParams.append("code_challenge_method", "S256");

  return {
    url: authUrl.toString(),
    verifier: codeVerifier,
    state: state,
  };
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForTokens(
  code: string,
  verifier: string
): Promise<TokenResponse | null> {
  try {
    if (!config.clientSecret) {
      return null;
    }

    const tokenUrl = ENDPOINTS.TOKEN;

    // Build request body
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("client_id", config.clientId);
    params.append("redirect_uri", config.redirectUri);
    params.append("code_verifier", verifier);

    // Build Basic Auth header
    const basicAuth = Buffer.from(
      `${config.clientId}:${config.clientSecret}`
    ).toString("base64");

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
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }

    return (await response.json()) as TokenResponse;
  } catch (error) {
    console.error("Token exchange failed:", error);
    return null;
  }
}

/**
 * Refresh access token
 */
async function refreshAccessToken(
  refreshToken: string
): Promise<TokenResponse | null> {
  try {
    if (!config.clientSecret) {
      return null;
    }

    const tokenUrl = ENDPOINTS.TOKEN;

    // Build request body
    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", refreshToken);

    // Build Basic Auth header
    const basicAuth = Buffer.from(
      `${config.clientId}:${config.clientSecret}`
    ).toString("base64");

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
    return null;
  }
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const parsedUrl = parse(req.url || "/", true);
  const pathname = parsedUrl.pathname || "/";

  // Set response headers
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });

  // Handle different paths
  if (pathname === "/") {
    // 检查URL中是否有授权码，如果有就不生成新的authData
    const hasAuthCode = parsedUrl.query.code !== undefined;

    // 只有在没有授权码的情况下才生成新的authData
    let authData;
    if (!hasAuthCode) {
      authData = await generateAuthUrl();
      codeVerifier = authData.verifier;
      state = authData.state;
      // 存储state和codeVerifier的映射关系
      codeVerifierMap.set(authData.state, authData.verifier);
    } else {
      // 如果有授权码，使用最后保存的codeVerifier
      authData = {
        url: "",
        verifier: codeVerifier,
        state: state,
      };
    }

    // Output home page HTML
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>X API OAuth 2.0 Authorization Tool</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 20px; color: #333; }
          h1, h2, h3 { color: #1DA1F2; }
          .success { color: #17BF63; font-weight: bold; }
          .error { color: #E0245E; font-weight: bold; }
          .code { background: #f1f1f1; padding: 10px; border-radius: 4px; font-family: monospace; overflow-wrap: break-word; word-break: break-all; }
          .container { border: 1px solid #ccc; border-radius: 8px; padding: 20px; margin: 20px 0; background: white; }
          .instructions { background: #f8f9fa; padding: 15px; border-left: 4px solid #1DA1F2; }
          .hidden { display: none; }
          .tab { overflow: hidden; border: 1px solid #ccc; background-color: #f1f1f1; border-radius: 5px 5px 0 0; }
          .tab button { background-color: inherit; float: left; border: none; outline: none; cursor: pointer; padding: 14px 16px; transition: 0.3s; }
          .tab button:hover { background-color: #ddd; }
          .tab button.active { background-color: #1DA1F2; color: white; }
          .tabcontent { display: none; padding: 6px 12px; border: 1px solid #ccc; border-top: none; border-radius: 0 0 5px 5px; }
          .show { display: block; }
          input, textarea { width: 100%; padding: 10px; margin: 8px 0; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; }
          button { background-color: #1DA1F2; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; }
          button:hover { background-color: #0c7abf; }
        </style>
        <script>
          // Store generated code_verifier
          let savedCodeVerifier = "${authData.verifier}";
          
          // Initialize page
          window.onload = function() {
            document.getElementById("defaultOpen").click();
            
            // If URL has authorization code, auto-fill and switch to exchange token tab
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            if (code) {
              document.getElementById('authCode').value = code;
              document.getElementById('codeVerifier').value = savedCodeVerifier;
              document.getElementById('exchangeToken').click();
            }
          }
          
          // Switch tabs
          function openTab(evt, tabName) {
            var i, tabcontent, tablinks;
            
            tabcontent = document.getElementsByClassName("tabcontent");
            for (i = 0; i < tabcontent.length; i++) {
              tabcontent[i].style.display = "none";
            }
            
            tablinks = document.getElementsByClassName("tablinks");
            for (i = 0; i < tablinks.length; i++) {
              tablinks[i].className = tablinks[i].className.replace(" active", "");
            }
            
            document.getElementById(tabName).style.display = "block";
            evt.currentTarget.className += " active";
          }
          
          // Submit authorization code and verifier for exchange token
          async function exchangeToken() {
            const authCode = document.getElementById('authCode').value;
            const codeVerifier = document.getElementById('codeVerifier').value;
            const resultArea = document.getElementById('exchangeResult');
            
            if (!authCode || !codeVerifier) {
              resultArea.innerHTML = '<p class="error">Please enter authorization code and Code Verifier</p>';
              return;
            }
            
            resultArea.innerHTML = '<p>Exchanging token, please wait...</p>';
            
            try {
              const response = await fetch('/exchange-token?code=' + encodeURIComponent(authCode) + '&verifier=' + encodeURIComponent(codeVerifier));
              const result = await response.json();
              
              if (result.error) {
                resultArea.innerHTML = '<p class="error">Exchange token failed: ' + result.error + '</p>';
              } else {
                let html = '<h3 class="success">Token exchange successful!</h3>';
                html += '<p><strong>Access Token:</strong></p>';
                html += '<div class="code">' + result.access_token + '</div>';
                
                if (result.refresh_token) {
                  html += '<p><strong>Refresh Token:</strong></p>';
                  html += '<div class="code">' + result.refresh_token + '</div>';
                  
                  // Auto-fill refresh token
                  document.getElementById('refreshToken').value = result.refresh_token;
                }
                
                html += '<p><strong>Expires in:</strong> ' + result.expires_in + ' seconds</p>';
                html += '<p><strong>Scope:</strong> ' + result.scope + '</p>';
                
                resultArea.innerHTML = html;
              }
            } catch (error) {
              resultArea.innerHTML = '<p class="error">Request failed: ' + error.message + '</p>';
            }
          }
          
          // Refresh token
          async function refreshToken() {
            const refreshToken = document.getElementById('refreshToken').value;
            const resultArea = document.getElementById('refreshResult');
            
            if (!refreshToken) {
              resultArea.innerHTML = '<p class="error">Please enter Refresh Token</p>';
              return;
            }
            
            resultArea.innerHTML = '<p>Refreshing token, please wait...</p>';
            
            try {
              const response = await fetch('/refresh-token?token=' + encodeURIComponent(refreshToken));
              const result = await response.json();
              
              if (result.error) {
                resultArea.innerHTML = '<p class="error">Refresh token failed: ' + result.error + '</p>';
              } else {
                let html = '<h3 class="success">Token refresh successful!</h3>';
                html += '<p><strong>New Access Token:</strong></p>';
                html += '<div class="code">' + result.access_token + '</div>';
                
                if (result.refresh_token) {
                  html += '<p><strong>New Refresh Token:</strong></p>';
                  html += '<div class="code">' + result.refresh_token + '</div>';
                  
                  // Update refresh token field
                  document.getElementById('refreshToken').value = result.refresh_token;
                }
                
                html += '<p><strong>Expires in:</strong> ' + result.expires_in + ' seconds</p>';
                html += '<p><strong>Scope:</strong> ' + result.scope + '</p>';
                
                resultArea.innerHTML = html;
              }
            } catch (error) {
              resultArea.innerHTML = '<p class="error">Request failed: ' + error.message + '</p>';
            }
          }
        </script>
      </head>
      <body>
        <h1>X API OAuth 2.0 Authorization Tool</h1>
        <p>This tool helps you complete the OAuth 2.0 authorization flow for X (Twitter) API, including generating authorization URL, receiving callback, exchanging token, and refreshing token.</p>
        
        <div class="tab">
          <button class="tablinks" onclick="openTab(event, 'AuthURL')" id="defaultOpen">1. Generate Authorization URL</button>
          <button class="tablinks" onclick="openTab(event, 'ExchangeToken')" id="exchangeToken">2. Exchange Access Token</button>
          <button class="tablinks" onclick="openTab(event, 'RefreshToken')">3. Refresh Access Token</button>
          <button class="tablinks" onclick="openTab(event, 'Help')">Help</button>
        </div>
        
        <div id="AuthURL" class="tabcontent">
          <h2>Step 1: Generate Authorization URL</h2>
          <div class="container">
            <p>Click the button below to open the authorization URL in a new window, using your X account to log in and authorize the application.</p>
            <div class="instructions">
              <p><strong>Authorization URL:</strong></p>
              <div class="code">${authData.url}</div>
              <br>
              <p><strong>Code Verifier (will be automatically saved for subsequent steps):</strong></p>
              <div class="code">${authData.verifier}</div>
            </div>
            <p><button onclick="window.open('${authData.url}', '_blank')">Open Authorization URL</button></p>
            <p>After authorization, X will redirect back to this page, automatically filling in the authorization code and switching to the next step.</p>
          </div>
        </div>
        
        <div id="ExchangeToken" class="tabcontent">
          <h2>Step 2: Exchange Access Token</h2>
          <div class="container">
            <p>Use the authorization code and Code Verifier to exchange access token and refresh token.</p>
            <div>
              <label for="authCode"><strong>Authorization Code:</strong></label>
              <input type="text" id="authCode" placeholder="Authorization code from URL" />
              
              <label for="codeVerifier"><strong>Code Verifier:</strong></label>
              <input type="text" id="codeVerifier" placeholder="Code Verifier from Step 1" />
              
              <button onclick="exchangeToken()">Exchange Token</button>
            </div>
            <div id="exchangeResult"></div>
          </div>
        </div>
        
        <div id="RefreshToken" class="tabcontent">
          <h2>Step 3: Refresh Access Token</h2>
          <div class="container">
            <p>When access token expires, use refresh token to get new access token.</p>
            <div>
              <label for="refreshToken"><strong>Refresh Token:</strong></label>
              <input type="text" id="refreshToken" placeholder="Refresh token from Step 2" />
              
              <button onclick="refreshToken()">Refresh Token</button>
            </div>
            <div id="refreshResult"></div>
          </div>
        </div>
        
        <div id="Help" class="tabcontent">
          <h2>Help Information</h2>
          <div class="container">
            <h3>OAuth 2.0 Authorization Flow</h3>
            <ol>
              <li><strong>Generate Authorization URL</strong>: Create authorization URL with PKCE challenge code</li>
              <li><strong>User Authorization</strong>: User visits authorization URL and agrees to grant application permissions</li>
              <li><strong>Receive Authorization Code</strong>: X redirects user back to your application, with authorization code</li>
              <li><strong>Exchange Access Token</strong>: Use authorization code and code_verifier to exchange for access token</li>
              <li><strong>Use Access Token</strong>: Use access token in API request</li>
              <li><strong>Refresh Token</strong>: Use refresh token to get new access token when access token expires</li>
            </ol>
            
            <h3>Security Tips</h3>
            <ul>
              <li>Please securely store your access token and refresh token, they can be used to access your X account</li>
              <li>Use environment variable or key management system to store tokens, avoid hardcoding in code</li>
              <li>Do not submit token information to version control system</li>
              <li>Periodically review authorized applications, revoke unauthorized access</li>
            </ul>
            
            <h3>Common Questions</h3>
            <p><strong>Authorization URL Invalid or Returns Error</strong></p>
            <ul>
              <li>Ensure you have correctly configured clientId in config.ts</li>
              <li>Check redirectUri is exactly the same as set in X Developer Portal</li>
            </ul>
            
            <p><strong>Token Exchange Failed</strong></p>
            <ul>
              <li>Ensure authorization code is used only once and not expired (usually valid within 10 minutes)</li>
              <li>Verify code_verifier is the same as used when generating authorization URL</li>
              <li>Check clientSecret is correctly configured</li>
            </ul>
          </div>
        </div>
      </body>
      </html>
    `;

    res.end(html);
  } else if (pathname === "/callback") {
    // Authorization callback - Handle authorization code
    const {
      code,
      state: receivedState,
      error,
      error_description,
    } = parsedUrl.query as CallbackQuery;

    if (code && receivedState && codeVerifierMap.has(receivedState)) {
      // 从映射中获取正确的codeVerifier
      codeVerifier = codeVerifierMap.get(receivedState) || "";
      state = receivedState;

      // Redirect back to home page with authorization code
      res.writeHead(302, {
        Location: `/?code=${code}`,
      });
      res.end();
    } else {
      // Error occurred, still redirect back to home page
      res.writeHead(302, {
        Location:
          "/?error=" +
          (error || "unknown_error") +
          (error_description ? "&error_description=" + error_description : ""),
      });
      res.end();
    }
  } else if (pathname === "/exchange-token") {
    // API endpoint - Exchange token
    const { code, verifier } = parsedUrl.query as {
      code?: string;
      verifier?: string;
    };

    if (!code || !verifier) {
      res.end(
        JSON.stringify({
          error:
            "Missing required parameters: authorization code or code_verifier",
        })
      );
      return;
    }

    const tokenData = await exchangeCodeForTokens(code, verifier);

    if (tokenData) {
      res.end(JSON.stringify(tokenData));
    } else {
      res.end(
        JSON.stringify({
          error:
            "Exchange token failed, please check parameters and configuration",
        })
      );
    }
  } else if (pathname === "/refresh-token") {
    // API endpoint - Refresh token
    const { token } = parsedUrl.query as { token?: string };

    if (!token) {
      res.end(
        JSON.stringify({ error: "Missing required parameter: refresh_token" })
      );
      return;
    }

    const tokenData = await refreshAccessToken(token);

    if (tokenData) {
      res.end(JSON.stringify(tokenData));
    } else {
      res.end(
        JSON.stringify({
          error:
            "Refresh token failed, please check parameters and configuration",
        })
      );
    }
  } else {
    // Unknown path, redirect back to home page
    res.writeHead(302, {
      Location: "/",
    });
    res.end();
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`\n===== X API OAuth 2.0 All-in-One Authorization Tool =====`);
  console.log(`Server is running, listening on port: ${PORT}`);
  console.log(`Please visit: http://localhost:${PORT}/ in your browser`);
  console.log(
    `\nEnsure the callback URL is set to: http://localhost:${PORT}/callback in the X Developer Portal`
  );
});
