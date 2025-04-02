import { Hono } from "hono";
import { processRequest } from "../services/gemini";
import { uploadImageToR2 } from "../services/r2Service";
import { Env } from "../types";
import { type Part } from "@google/generative-ai";

const app = new Hono<{ Bindings: Env }>();

app.post("/generate", async (c) => {
  try {
    console.log("Starting to process request...");
    const { prompt, image } = await c.req.json();
    console.log("Received parameters:", { prompt, imageLength: image?.length });

    if (!prompt) {
      console.log("Parameter validation failed:", { prompt });
      return c.json({ error: "Missing required parameters" }, 400);
    }

    // Get environment variables
    const apiKey = c.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.log("API Key not configured");
      return c.json({ error: "GEMINI_API_KEY not configured" }, 500);
    }

    // Process Gemini request
    console.log("Starting to call Gemini API...");
    const userParts: Part[] = [{ text: prompt }];

    // If image is provided, add it to the request
    if (image) {
      userParts.push({
        inlineData: { mimeType: "image/jpeg", data: image },
      } as Part);
    }

    const parts = await processRequest(
      {
        contents: [
          {
            role: "user",
            parts: userParts,
          },
        ],
      },
      apiKey
    );

    // Get generated image
    const generatedImage = parts.find((part) => part.inlineData);
    if (!generatedImage?.inlineData) {
      console.log("Generated image data not found");
      return c.json({ error: "Image not generated" }, 500);
    }

    // Generate file name
    const fileName = `generated-${Date.now()}.png`;
    console.log("Preparing to upload to R2:", { fileName });

    // Upload to R2
    console.log("Starting upload to R2...");
    const imageUrl = await uploadImageToR2(
      `data:image/png;base64,${generatedImage.inlineData.data}`,
      c.env.R2Bucket,
      fileName,
      c.env.R2_PUBLIC_URL
    );
    console.log("R2 upload successful:", { imageUrl });

    return c.json({
      success: true,
      imageUrl,
    });
  } catch (error: any) {
    console.error("Error processing request:", error);
    console.error("Error details:", {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    });
    return c.json({ error: "Error processing request" }, 500);
  }
});

export default app;
