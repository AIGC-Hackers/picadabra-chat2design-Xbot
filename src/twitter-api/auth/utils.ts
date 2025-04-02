/**
 * Twitter API OAuth 2.0 Common Utility Functions
 */

import crypto from "crypto";

/**
 * Generate random string for PKCE and state
 * @param length Length of the generated string
 * @returns Random string
 */
export function generateRandomString(length: number): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const charactersLength = characters.length;
  let result = "";

  // Use crypto module to generate secure random values
  const randomValues = new Uint8Array(length);
  crypto.randomFillSync(randomValues);

  for (let i = 0; i < length; i++) {
    result += characters.charAt(
      Math.floor((randomValues[i] / 256) * charactersLength)
    );
  }

  // Ensure length meets PKCE requirements (43-128)
  return result.substring(0, Math.max(43, Math.min(length, 128)));
}

/**
 * Generate code_challenge for PKCE
 * @param verifier code_verifier
 * @returns code_challenge
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = crypto.createHash("sha256").update(verifier).digest();

  // Base64URL encoding
  return hash
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Validate required configuration parameters
 * @param config Configuration object
 * @param requiredKeys Required keys
 * @param defaultValue Default value for checking
 */
export function validateConfig(
  config: Record<string, string>,
  requiredKeys: string[],
  defaultValue: string = "YOUR_CLIENT_ID"
): void {
  const missingKeys = requiredKeys.filter(
    (key) => !config[key] || config[key] === defaultValue
  );

  if (missingKeys.length > 0) {
    console.error(
      `\nError: Please set the following parameters in the configuration: ${missingKeys.join(
        ", "
      )}\n`
    );
    process.exit(1);
  }
}
