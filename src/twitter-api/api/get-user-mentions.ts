import { HttpClient } from "../common/http-client.js";
import { Logger, LogLevel } from "../common/logger.js";

interface TwitterTweet {
  id: string;
  text: string;
  edit_history_tweet_ids?: string[];
}

interface TwitterMentionsResponse {
  data: TwitterTweet[];
  meta: {
    result_count: number;
    newest_id: string;
    oldest_id: string;
    next_token?: string;
  };
}

export interface GetMentionsOptions {
  maxResults?: number;
  sinceId?: string;
  untilId?: string;
  paginationToken?: string;
}

/**
 * Twitter user mentions API client
 */
export class TwitterMentionsClient {
  private httpClient: HttpClient;
  private logger: Logger;
  private MODULE_NAME = "MentionsClient";

  constructor(bearerToken: string, logger?: Logger) {
    this.logger = logger || new Logger({ logLevel: LogLevel.INFO });

    this.httpClient = new HttpClient({
      baseUrl: "https://api.twitter.com",
      bearerToken,
      logger: this.logger,
    });

    this.logger.info(this.MODULE_NAME, "TwitterMentionsClient initialized");
  }

  /**
   * Get user mentions
   * @param userId User ID
   * @param options Optional parameters
   * @returns User mentions list
   */
  async getUserMentions(
    userId: string,
    options: GetMentionsOptions = {}
  ): Promise<TwitterMentionsResponse> {
    this.logger.info(this.MODULE_NAME, "Getting user mentions", {
      userId,
      ...options,
    });

    try {
      const queryParams: Record<string, string> = {};

      // Add optional parameters
      // if (options.maxResults) {
      //   queryParams.max_results = options.maxResults.toString();
      // }

      if (options.sinceId) {
        queryParams.since_id = options.sinceId;
      }

      if (options.untilId) {
        queryParams.until_id = options.untilId;
      }

      if (options.paginationToken) {
        queryParams.pagination_token = options.paginationToken;
      }

      const response = await this.httpClient.get<TwitterMentionsResponse>({
        url: `/2/users/${userId}/mentions`,
        queryParams,
        moduleName: this.MODULE_NAME,
      });
      return response;
    } catch (error) {
      this.logger.error(this.MODULE_NAME, "Failed to get user mentions", error);
      throw error;
    }
  }
}
