import { HttpClient } from "../common/http-client.js";
import { Logger, LogLevel } from "../common/logger.js";

interface TwitterPostMedia {
  media_ids: string[];
  tagged_user_ids?: string[];
}

interface TwitterPostReply {
  in_reply_to_tweet_id: string;
}

interface TwitterPostData {
  text: string;
  for_super_followers_only?: boolean;
  nullcast?: boolean;
  media?: TwitterPostMedia;
  reply?: TwitterPostReply;
}

interface TwitterPostResponse {
  data: {
    id: string;
    edit_history_tweet_ids: string[];
    text: string;
  };
}

/**
 * Twitter post API client
 */
export class TwitterPostClient {
  private httpClient: HttpClient;
  private logger: Logger;
  private MODULE_NAME = "PostClient";

  constructor(bearerToken: string, logger?: Logger) {
    this.logger = logger || new Logger({ logLevel: LogLevel.INFO });

    this.httpClient = new HttpClient({
      baseUrl: "https://api.twitter.com",
      bearerToken,
      logger: this.logger,
    });

    this.logger.info(this.MODULE_NAME, "TwitterPostClient initialized");
  }

  /**
   * Create tweet
   */
  async createPost(postData: TwitterPostData): Promise<TwitterPostResponse> {
    this.logger.info(this.MODULE_NAME, "Creating new post", {
      text: postData.text,
    });

    try {
      const response = await this.httpClient.post<TwitterPostResponse>({
        url: "/2/tweets",
        body: postData,
        headers: {
          "Content-Type": "application/json",
        },
        moduleName: this.MODULE_NAME,
      });

      this.logger.info(this.MODULE_NAME, "Post created successfully", {
        postId: response.data.id,
        text: response.data.text,
      });

      return response;
    } catch (error) {
      this.logger.error(this.MODULE_NAME, "Failed to create post", error);
      throw error;
    }
  }

  /**
   * Reply to tweet
   */
  async replyToPost(
    inReplyToTweetId: string,
    text: string,
    mediaIds?: string[]
  ): Promise<TwitterPostResponse> {
    const postData: TwitterPostData = {
      text,
      reply: {
        in_reply_to_tweet_id: inReplyToTweetId,
      },
    };

    // If media IDs exist, add them to the request
    if (mediaIds && mediaIds.length > 0) {
      postData.media = {
        media_ids: mediaIds,
        tagged_user_ids: [],
      };
    }

    this.logger.info(this.MODULE_NAME, "Replying to post", {
      inReplyToTweetId,
      text,
    });

    return this.createPost(postData);
  }
}
