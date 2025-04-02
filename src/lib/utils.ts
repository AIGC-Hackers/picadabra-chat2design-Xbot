import { Env } from "../types";

const BASE64_CHUNK_SIZE = 8192; // For converting large ArrayBuffers to binary strings
export const MAX_REPLY_LENGTH = 280;
export const TRUNCATION_SUFFIX = "...";

/**
 * Convert ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binaryString = "";
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + BASE64_CHUNK_SIZE);
    binaryString += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binaryString);
}

/**
 * Converts a Base64 string to a Uint8Array.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  try {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error("Failed to decode base64 string:", e);
    throw new Error("Invalid base64 string provided to base64ToUint8Array");
  }
}

// Validate image data
export function isValidBase64Image(base64String: string): boolean {
  try {
    // Check if it's a valid base64 string
    if (!/^data:image\/(jpeg|png|jpg);base64,/.test(base64String)) {
      return false;
    }

    // Check if the base64 part is valid
    const base64Data = base64String.split(",")[1];
    if (!base64Data || !/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
      return false;
    }

    // Check if the decoded size is reasonable (max 10MB)
    const decodedSize = Math.ceil((base64Data.length * 3) / 4);
    if (decodedSize > 10 * 1024 * 1024) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch image from URL, convert to base64, and determine MIME type.
 */
export async function fetchImageAsBase64(
  imageUrl: string
): Promise<{ mimeType: string; base64Data: string } | null> {
  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      console.warn(
        `Failed to fetch image: ${imageUrl}, Status: ${response.status}`
      );
      return null;
    }

    const imageBuffer = await response.arrayBuffer();
    const base64Data = arrayBufferToBase64(imageBuffer);

    // Prioritize Content-Type header
    let mimeType = response.headers.get("content-type")?.split(";")[0].trim();

    // Fallback to extension guessing if header is missing or generic
    if (!mimeType || mimeType === "application/octet-stream") {
      console.warn(
        `Missing or generic Content-Type for ${imageUrl}. Guessing from extension.`
      );
      const lowerUrl = imageUrl.toLowerCase();
      if (lowerUrl.endsWith(".png")) {
        mimeType = "image/png";
      } else if (lowerUrl.endsWith(".gif")) {
        mimeType = "image/gif";
      } else if (lowerUrl.endsWith(".jpg") || lowerUrl.endsWith(".jpeg")) {
        mimeType = "image/jpeg";
      } else if (lowerUrl.endsWith(".webp")) {
        mimeType = "image/webp";
      } else {
        mimeType = "image/jpeg"; // Default guess
        console.warn(
          `Could not determine MIME type for ${imageUrl}, defaulting to ${mimeType}`
        );
      }
    }

    return { mimeType, base64Data };
  } catch (error) {
    console.error(`Error fetching or processing image ${imageUrl}:`, error);
    return null;
  }
}

/**
 * Filter @username mentions from text (completely removes them)
 */
export function filterMentions(text: string): string {
  return text.replace(/@[^\s]+/g, "").trim();
}

/**
 * Filter t.co URLs from text
 */
export function filterTcoUrls(text: string): string {
  return text.replace(/https:\/\/t\.co\/\w+/g, "").trim();
}

/**
 * Extract image URLs from response
 */
export function extractImageUrls(content: string): string[] {
  const regex = /!\[.*?\]\((https:\/\/[^)]+)\)/g;
  const urls: string[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    urls.push(match[1]);
  }

  return urls;
}

/**
 * Get Twitter credentials from KV store or environment variables.
 */
export async function getCredentials(env: Env): Promise<{
  bearerToken: string;
  userId: string;
} | null> {
  const bearerToken =
    (await env.KV.get("TWITTER_ACCESS_TOKEN")) || env.TWITTER_ACCESS_TOKEN;
  const userId = (await env.KV.get("TWITTER_USER_ID")) || env.TWITTER_USER_ID;

  if (!bearerToken || !userId) {
    console.error(
      "Missing required Twitter credentials (TWITTER_ACCESS_TOKEN or TWITTER_USER_ID in KV or env)."
    );
    return null;
  }

  return { bearerToken, userId };
}
