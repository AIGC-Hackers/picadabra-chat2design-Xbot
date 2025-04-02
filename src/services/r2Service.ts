import { isValidBase64Image } from "../lib/utils";

/**
 * R2 Storage Service
 * Handles all interactions with Cloudflare R2 object storage
 */

/**
 * Upload a base64 encoded image to R2 storage
 * @param base64Image - Base64 encoded image string
 * @param r2Bucket - R2 bucket instance
 * @param fileName - Name to save the file as
 * @param r2PublicUrl - Public URL prefix for the R2 bucket
 * @returns Public URL to the uploaded file
 */
export async function uploadImageToR2(
  base64Image: string,
  r2Bucket: R2Bucket,
  fileName: string,
  r2PublicUrl: string
): Promise<string> {
  if (!isValidBase64Image(base64Image)) {
    throw new Error("Invalid image data");
  }

  // Extract image data from base64 string
  const base64Data = base64Image.split(",")[1];
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Upload to R2
  await r2Bucket.put(fileName, bytes, {
    httpMetadata: {
      contentType: "image/png",
      cacheControl: "public, max-age=31536000",
    },
  });

  // Return accessible URL
  return `${r2PublicUrl}/${fileName}`;
}

/**
 * Download an image from a URL and upload it to R2
 * @param imageUrl - URL of the image to download
 * @param r2Bucket - R2 bucket instance
 * @param r2PublicUrl - Public URL prefix for the R2 bucket
 * @returns Public URL to the uploaded file
 */
export async function downloadImageToR2(
  imageUrl: string,
  r2Bucket: R2Bucket,
  r2PublicUrl: string
): Promise<string> {
  try {
    // Get image content
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to download image: ${response.status} ${response.statusText}`
      );
    }

    // Read image data
    const imageData = await response.arrayBuffer();
    const fileName = `downloaded-${Date.now()}.png`;

    // Upload to R2
    await r2Bucket.put(fileName, imageData, {
      httpMetadata: {
        contentType: "image/png",
        cacheControl: "public, max-age=31536000",
      },
    });

    // Return accessible URL
    return `${r2PublicUrl}/${fileName}`;
  } catch (error) {
    console.error("Failed to process image:", error);
    throw new Error("Failed to process image");
  }
}

/**
 * Get a file from R2 storage
 * @param r2Bucket - R2 bucket instance
 * @param fileName - Name of the file to retrieve
 * @returns File data or null if not found
 */
export async function getFileFromR2(
  r2Bucket: R2Bucket,
  fileName: string
): Promise<R2ObjectBody | null> {
  const object = await r2Bucket.get(fileName);
  return object;
}

/**
 * Delete a file from R2 storage
 * @param r2Bucket - R2 bucket instance
 * @param fileName - Name of the file to delete
 * @returns Boolean indicating if deletion was successful
 */
export async function deleteFileFromR2(
  r2Bucket: R2Bucket,
  fileName: string
): Promise<boolean> {
  try {
    await r2Bucket.delete(fileName);
    return true;
  } catch (error) {
    console.error("Error deleting file from R2:", error);
    return false;
  }
}
