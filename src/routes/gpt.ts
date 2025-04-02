import { Hono } from "hono";
import { processGptRequest } from "../services/gpt";
import { Env } from "../types";
import { downloadImageToR2 } from "../services/r2Service";
import { extractImageUrls } from "../lib/utils";
const app = new Hono<{ Bindings: Env }>();

app.post("/completions", async (c) => {
  try {
    console.log("Starting to process GPT request...");
    const requestData = await c.req.json();
    console.log("Received parameters:", {
      model: requestData.model,
      messagesCount: requestData.messages?.length,
    });

    if (
      !requestData.messages ||
      !Array.isArray(requestData.messages) ||
      requestData.messages.length === 0
    ) {
      console.log("Parameter validation failed:", {
        messages: requestData.messages,
      });
      return c.json({ error: "Invalid messages parameter" }, 400);
    }

    // Get environment variables
    const apiKey = c.env.GPT_API_KEY;
    console.log("Environment variables check:", {
      hasApiKey: !!apiKey,
      hasR2Bucket: !!c.env.R2Bucket,
      r2PublicUrl: c.env.R2_PUBLIC_URL,
    });

    if (!apiKey) {
      console.log("API Key not configured");
      return c.json({ error: "GPT_API_KEY not configured" }, 500);
    }

    // Process request parameters
    const model = requestData.model || "gpt-4o-plus";
    const temperature = requestData.temperature || 0.7;
    const maxTokens = requestData.max_tokens || null;

    // Call GPT API
    console.log("Starting to call GPT API...");
    const response = await processGptRequest(
      requestData.messages,
      apiKey,
      model,
      temperature,
      maxTokens
    );

    console.log("GPT API response:", {
      id: response.id,
      model: response.model,
      choices: response.choices,
      usageTotal: response.usage?.total_tokens,
    });

    // Process images
    const assistantMessage = response.choices?.[0]?.message?.content;
    if (assistantMessage) {
      const imageUrls = extractImageUrls(assistantMessage);
      console.log("Extracted image URLs:", { count: imageUrls.length });

      if (imageUrls.length > 0 && c.env.R2Bucket) {
        // Download and upload to R2
        const uploadedUrls = await Promise.all(
          imageUrls.map(async (url) => {
            try {
              const r2Url = await downloadImageToR2(
                url,
                c.env.R2Bucket,
                c.env.R2_PUBLIC_URL
              );
              return { original: url, r2: r2Url };
            } catch (error) {
              console.error("Image processing failed:", error);
              return { original: url, error: true };
            }
          })
        );

        console.log("Image processing results:", uploadedUrls);

        // Replace image URLs in response with R2 URLs
        let newContent = assistantMessage;
        uploadedUrls.forEach((urlPair) => {
          if (!urlPair.error && urlPair.r2) {
            newContent = newContent.replace(urlPair.original, urlPair.r2);
          }
        });

        if (newContent !== assistantMessage) {
          response.choices[0].message.content = newContent;
        }
      }
    }

    return c.json(response);
  } catch (error: any) {
    console.error("Error processing request:", error);
    console.error("Error details:", {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    });
    return c.json(
      { error: "Error processing request", message: error?.message },
      500
    );
  }
});

export default app;
