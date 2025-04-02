/**
 * Global environment variables type definition
 */
export interface Env {
  QUEUE: Queue;
  TWITTER_USER_ID: string;
  TWITTER_ACCESS_TOKEN: string;
  TWITTER_REFRESH_TOKEN: string;
  TWITTER_CLIENT_ID: string;
  TWITTER_CLIENT_SECRET: string;
  GEMINI_API_KEY: string;
  GPT_API_KEY: string;
  R2_PUBLIC_URL: string;
  KV: KVNamespace;
  R2Bucket: R2Bucket;
  DB: D1Database;
  MY_TWITTER_WORKFLOW: Workflow;
}

/**
 * ChatGPT message definition
 */
export interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * ChatGPT API response
 */
export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_tokens_details?: {
      text_tokens: number;
      image_tokens: number;
    };
    completion_tokens_details?: {
      image_tokens: number;
      content_tokens: number;
    };
  };
}

/**
 * Twitter API token response
 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
}
