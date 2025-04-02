import { extractImageUrls } from "../lib/utils";
import type { ChatCompletionMessage, ChatCompletionResponse } from "../types";

// Test server URL
const API_URL =
  "https://twitter-chat2design.liuwenqing1118.workers.dev/api/gpt/completions";

/**
 * Extract image URLs from text
 */

/**
 * Call GPT API to generate content
 */
async function callGptApi(
  messages: ChatCompletionMessage[],
  model: string = "gpt-4o-plus"
): Promise<ChatCompletionResponse> {
  try {
    console.log(`Calling ${model} API...`);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `API request failed: ${response.status} ${response.statusText} - ${
          typeof errorData === "object" ? JSON.stringify(errorData) : errorData
        }`
      );
    }

    const data = (await response.json()) as ChatCompletionResponse;
    console.log(`API request successful, response ID: ${data.id}`);
    return data;
  } catch (error) {
    console.error("API request error:", error);
    throw error;
  }
}

/**
 * Test image generation
 */
async function testImageGeneration() {
  console.log("===== Testing Image Generation =====");
  try {
    const messages: ChatCompletionMessage[] = [
      {
        role: "user",
        content: "Draw a picture of a dog",
      },
    ];

    const data = await callGptApi(messages);

    console.log("Response content:");
    console.log(`- Model: ${data.model}`);

    // Extract image URLs
    const content = data.choices?.[0]?.message?.content || "";
    const imageUrls = extractImageUrls(content);

    console.log(`- Number of extracted image URLs: ${imageUrls.length}`);
    if (imageUrls.length > 0) {
      console.log(`- First image URL: ${imageUrls[0]}`);
    }

    // Simple validation
    if (imageUrls.length === 0) {
      throw new Error("No image URLs in response");
    }

    console.log("✅ Image generation test passed");
    return data;
  } catch (error) {
    console.error("❌ Image generation test failed:", error);
    throw error;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log("Starting GPT API tests...");

  try {
    await testImageGeneration();

    console.log("✅ All tests completed");
  } catch (error) {
    console.error("❌ Error during testing process:", error);
  }
}

// Execute tests
runAllTests().catch(console.error);
