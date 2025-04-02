import {
  GoogleGenerativeAI,
  type GenerateContentRequest,
  type GenerationConfig,
  type Part,
} from "@google/generative-ai";

// Extend GenerationConfig type to include responseModalities
interface ExtendedGenerationConfig extends GenerationConfig {
  responseModalities?: string[];
}

// Generic AI image processing service
export async function processRequest(
  request: GenerateContentRequest,
  apiKey: string
): Promise<Part[]> {
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp-image-generation",
    generationConfig: {
      responseModalities: ["Text", "Image"],
    } as ExtendedGenerationConfig,
  });

  const result = await model.generateContent(request);

  const response = await result.response;
  const parts = response.candidates?.[0].content.parts;

  if (!parts || parts.length === 0) {
    throw new Error("Failed to process image: Unable to get processing result");
  }

  return parts;
}
