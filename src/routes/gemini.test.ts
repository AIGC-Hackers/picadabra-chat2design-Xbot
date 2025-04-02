// Test image base64 encoding (this is a sample image, you need to replace it with an actual image)
const testImage =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function testGeminiAPI() {
  try {
    const response = await fetch(
      "https://twitter-chat2design.liuwenqing1118.workers.dev/api/gemini/generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: "Generate a simple test image",
          //   image: testImage,
        }),
      }
    );

    const data = (await response.json()) as {
      success?: boolean;
      imageUrl?: string;
      error?: string;
    };
    console.log("API response:", data);

    if (!response.ok) {
      console.error("Request failed:", data.error);
      return;
    }

    console.log("Generated image URL:", data.imageUrl);
  } catch (error) {
    console.error("Error during test:", error);
  }
}

// Run test
testGeminiAPI();
