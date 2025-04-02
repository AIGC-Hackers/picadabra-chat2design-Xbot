import {
  type ChatCompletionMessage,
  type ChatCompletionResponse,
} from "../types";

/**
 * Process GPT request
 */
export async function processGptRequest(
  messages: ChatCompletionMessage[],
  apiKey: string,
  model: string = "gpt-4o-plus",
  temperature: number = 0.7,
  maxTokens: number | null = null
): Promise<ChatCompletionResponse> {
  const requestBody: any = {
    model,
    messages,
    temperature,
  };

  // Add optional parameters
  if (maxTokens !== null) {
    requestBody.max_tokens = maxTokens;
  }

  // Call 302.ai API
  const response = await fetch("https://api.302.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  console.log("302.ai API Response:", response);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `GPT API request failed: ${response.status} ${response.statusText} - ${
        typeof errorData === "object" ? JSON.stringify(errorData) : errorData
      }`
    );
  }

  return await response.json();
}


