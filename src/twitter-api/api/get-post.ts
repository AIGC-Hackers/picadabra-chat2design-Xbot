import { HttpClient } from "../common/http-client.js";
import { Logger, LogLevel } from "../common/logger.js";

// Define Twitter API response types
export interface TwitterMedia {
  media_key: string;
  type: string;
  url?: string;
  width?: number;
  height?: number;
  preview_image_url?: string;
  alt_text?: string;
}

export interface TwitterUser {
  id: string;
  name: string;
  username: string;
}

export interface ReferencedTweet {
  type: string;
  id: string;
}

export interface TweetData {
  id: string;
  text: string;
  author_id?: string;
  attachments?: {
    media_keys: string[];
  };
  edit_history_tweet_ids?: string[];
  created_at?: string;
  referenced_tweets?: ReferencedTweet[];
}

export interface TwitterPostResponse {
  data: TweetData;
  includes?: {
    media?: TwitterMedia[];
    users?: TwitterUser[];
    tweets?: TweetData[];
  };
}

/**
 * Twitter Post API Client for retrieving posts
 */
export class TwitterPostReader {
  private httpClient: HttpClient;
  private logger: Logger;
  private MODULE_NAME = "PostReader";

  constructor(bearerToken: string, logger?: Logger) {
    this.logger = logger || new Logger({ logLevel: LogLevel.INFO });

    this.httpClient = new HttpClient({
      baseUrl: "https://api.twitter.com",
      bearerToken,
      logger: this.logger,
    });

    this.logger.info(this.MODULE_NAME, "TwitterPostReader initialized");
  }

  /**
   * Get post details
   * @param postId Post ID
   * @returns Post details
   */
  async getPost(postId: string): Promise<TwitterPostResponse> {
    this.logger.info(this.MODULE_NAME, "Getting post details", { postId });

    try {
      const queryParams = {
        "tweet.fields": "attachments,author_id,created_at,referenced_tweets",
        expansions:
          "attachments.media_keys,author_id,referenced_tweets.id.attachments.media_keys",
        "media.fields": "url,width,height,type,preview_image_url,alt_text",
        "user.fields": "id,name,username",
      };

      const response = await this.httpClient.get<TwitterPostResponse>({
        url: `/2/tweets/${postId}`,
        queryParams,
        moduleName: this.MODULE_NAME,
      });

      this.logger.info(this.MODULE_NAME, "Post retrieved successfully", {
        postId: response.data.id,
        textLength: response.data.text.length,
        hasMedia: !!response.includes?.media?.length,
      });

      return response;
    } catch (error) {
      this.logger.error(this.MODULE_NAME, "Failed to get post", error);
      throw error;
    }
  }
}
