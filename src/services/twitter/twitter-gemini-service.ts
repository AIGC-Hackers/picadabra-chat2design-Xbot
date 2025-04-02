import type {
  Part,
  GenerateContentRequest,
  Content,
} from "@google/generative-ai";
import type { Env } from "../../types";
import { TwitterPostClient } from "../../twitter-api/api/create-post";
import { processRequest } from "../gemini";
import { uploadImageToR2 } from "../r2Service";
import { base64ToUint8Array, fetchImageAsBase64 } from "../../lib/utils";
import { TwitterMediaUploader } from "../../twitter-api/api/media-upload";
import { Task } from "../../db/schema";
import { TweetSource } from "./tweet-details-service";
import { TwitterMedia } from "../../twitter-api/api/get-post";

export interface GeminiResponse {
  text: string;
  mediaId?: string;
  imageUrl?: string;
}

const systemInstruction = `
System Instruction:
**Core Mission**
Based on the user's main tweet content (including text and images), perform the following operations:
1. Generate completely new creative images from text descriptions
2. Intelligently edit existing images in the main tweet
3. Enhance contextual understanding by incorporating quoted tweet content

**Processing Rules**
1. Main Content Processing:
- Text Analysis: Extract entity descriptions (objects/actions/scenes), style indicators (e.g., "pixel art"), modification instructions (e.g., "brighten the background")
- Image Analysis: Identify composition elements, color distribution, and focal areas in existing images
- Instruction Detection: Determine operation type (generate/edit) through action verbs:
  • Generation triggers: draw/generate/create/make...
  • Editing triggers: modify/adjust/replace/add...

2. Quoted Content Usage:
- Reference quoted tweet's thematic direction when main tweet contains ambiguity
- Inherit artistic style from quoted tweets (if unspecified in main tweet)
- Prohibit direct copying of specific elements from quoted content

3. Generation/Editing Workflow:
🖼️ Generation Mode:
① Materialize abstract descriptions (e.g., "futuristic" → cyberpunk elements)
② Extract and blend common features when main tweet contains multiple images
③ Priority handling for text-image conflicts:
   Explicit text instructions > Image implied features > Quoted content supplements

✏️ Editing Mode:
① Identify in edit instructions:
   - Target areas (using relative positioning: lower-left/background/character clothing)
   - Modification types (color/content/style adjustments)
   - Intensity parameters (subtle/complete/moderate)
② Preserve original core composition (unless reconstruction requested)
③ Support hybrid operations (e.g., "add starry sky background to existing image")

4. Creativity Requirements:
- Reasonably expand vague instructions (e.g., "more impactful" → enhance contrast + dynamic composition)
- Maintain visual logic consistency (lighting direction/perspective angle/proportional relationships)
- Ensure style variation exceeds 30% difference when generating multiple options
`;

/**
 * Prepare image parts for Gemini API
 */
async function prepareImageParts(mediaItems: TwitterMedia[]): Promise<Part[]> {
  // Only filter photo media with valid URLs
  const images = mediaItems.filter(
    (media) => media.type === "photo" && media.url
  );

  if (images.length === 0) {
    return [];
  }

  // Fetch and process images concurrently
  const imagePromises = images.map((img) => fetchImageAsBase64(img.url!));
  const resolvedImages = await Promise.all(imagePromises);

  // Filter out any null results and map to Gemini Part format
  const imageParts: Part[] = resolvedImages
    .filter(
      (imageData): imageData is { mimeType: string; base64Data: string } =>
        imageData !== null
    )
    .map((imageData) => ({
      inlineData: {
        mimeType: imageData.mimeType,
        data: imageData.base64Data,
      },
    }));

  if (imageParts.length < images.length) {
    console.warn(
      `Processed ${imageParts.length} images out of ${images.length} potential candidates due to fetch/processing errors.`
    );
  }

  return imageParts;
}

async function prepareGeminiRequest(
  tweetSource: TweetSource
): Promise<GenerateContentRequest> {
  const contents: Content[] = [
    {
      role: "user",
      parts: [{ text: systemInstruction }],
    },
  ];
  const refParts: Part[] = [];
  const parts: Part[] = [];

  if (tweetSource.referencedTweets) {
    for (const tweet of tweetSource.referencedTweets) {
      // const tweetText = tweet.text;
      const imageParts = await prepareImageParts(tweet.mediaItems || []);
      //TODO: -> Test: only image
      // refParts.push(...imageParts, { text: tweetText });
      refParts.push(...imageParts);
    }

    contents.push({
      role: "user",
      parts: [
        { text: "<reference-tweets>" },
        ...refParts,
        { text: "</reference-tweets>" },
      ],
    });
  }

  const tweetImageParts = await prepareImageParts(
    tweetSource.tweet.mediaItems || []
  );
  parts.push(...tweetImageParts, { text: tweetSource.tweet.text });
  contents.push({
    role: "user",
    parts: [{ text: "<tweet>" }, ...parts, { text: "</tweet>" }],
  });

  return {
    contents,
  };
}

/**
 * Call Gemini API to generate content and upload media
 */
export async function generateWithGeminiAndUploadMedia(
  task: Task,
  apiKey: string,
  env: Env,
  bearerToken: string
): Promise<GeminiResponse | null> {
  const tweetSource = task.prompt
    ? (JSON.parse(task.prompt) as TweetSource)
    : null;

  if (!tweetSource) {
    console.error("No tweet source found for task", task.id);
    return null;
  }

  try {
    const request = await prepareGeminiRequest(tweetSource);

    const geminiResponse = await processRequest(request, apiKey);

    let responseText = "";
    let generatedImagePart: Part | undefined;

    // Extract text and potential image data from Gemini response
    for (const part of geminiResponse) {
      if (typeof part === "object" && part !== null) {
        if ("text" in part && typeof part.text === "string") {
          responseText += part.text;
        } else if (
          "inlineData" in part &&
          typeof part.inlineData === "object" &&
          part.inlineData !== null &&
          "data" in part.inlineData &&
          "mimeType" in part.inlineData
        ) {
          generatedImagePart = part;
          break;
        }
      } else if (typeof part === "string") {
        responseText += part;
      }
    }

    if (!responseText && !generatedImagePart) {
      throw new Error(
        "Gemini response did not contain usable text or image data."
      );
    }

    let twitterMediaId: string | undefined;
    let r2ImageUrl: string | undefined;

    // Process generated image
    if (generatedImagePart?.inlineData) {
      const { mimeType, data: base64Data } = generatedImagePart.inlineData;
      try {
        // 1. Upload to R2
        const fileExtension = mimeType.split("/")[1] || "png";
        const fileName = `gemini-response-${Date.now()}.${fileExtension}`;
        r2ImageUrl = await uploadImageToR2(
          `data:${mimeType};base64,${base64Data}`,
          env.R2Bucket,
          fileName,
          env.R2_PUBLIC_URL
        );

        // 2. Upload to Twitter Media
        const mediaUploader = new TwitterMediaUploader({
          bearerToken,
          mediaType: mimeType,
          mediaCategory: "tweet_image",
        });

        const binaryData = base64ToUint8Array(base64Data);
        const file = new File(
          [binaryData],
          `generated_image.${fileExtension}`,
          { type: mimeType }
        );

        twitterMediaId = await mediaUploader.uploadMedia(
          file,
          mimeType,
          "tweet_image"
        );
      } catch (uploadError) {
        console.error("Failed to upload generated image:", uploadError);
        twitterMediaId = undefined;
      }
    }

    return {
      text: responseText.trim(),
      mediaId: twitterMediaId,
      imageUrl: r2ImageUrl,
    };
  } catch (error) {
    console.error("Gemini API call failed:", error);
    return null;
  }
}

/**
 * Reply to tweet
 */
export async function replyToTweet(
  postClient: TwitterPostClient,
  tweetId: string,
  content: GeminiResponse | null
): Promise<string | null> {
  try {
    if (!content) {
      console.warn(`No content provided for tweet ${tweetId}, skipping reply.`);
      return null;
    }

    let replyText = content.text;
    // if (replyText.length > MAX_REPLY_LENGTH) {
    //   replyText =
    //     replyText.substring(0, MAX_REPLY_LENGTH - TRUNCATION_SUFFIX.length) +
    //     TRUNCATION_SUFFIX;
    //   console.warn(`Reply text truncated for tweet ${tweetId}`);
    // }

    const mediaIds = content.mediaId ? [content.mediaId] : undefined;

    const replyResponse = await postClient.replyToPost(
      tweetId,
      replyText,
      mediaIds
    );

    return replyResponse.data.id;
  } catch (error) {
    console.error(
      `Failed to reply to tweet ${tweetId}:`,
      error instanceof Error ? error.message : error
    );
    return null;
  }
}
