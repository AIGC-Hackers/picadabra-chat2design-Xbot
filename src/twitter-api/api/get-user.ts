import { HttpClient } from "../common/http-client.js";
import { Logger, LogLevel } from "../common/logger.js";

interface TwitterUserResponse {
  data: {
    id: string;
    name: string;
    username: string;
  };
}

/**
 * Twitter User API Client
 */
export class TwitterUserClient {
  private httpClient: HttpClient;
  private logger: Logger;
  private MODULE_NAME = "UserClient";

  constructor(bearerToken: string, logger?: Logger) {
    this.logger = logger || new Logger({ logLevel: LogLevel.INFO });

    this.httpClient = new HttpClient({
      baseUrl: "https://api.twitter.com",
      bearerToken,
      logger: this.logger,
    });

    this.logger.info(this.MODULE_NAME, "TwitterUserClient initialized");
  }

  /**
   * Get user information by username
   */
  async getUserByUsername(username: string): Promise<TwitterUserResponse> {
    this.logger.info(this.MODULE_NAME, "Getting user by username", {
      username,
    });

    try {
      const response = await this.httpClient.get<TwitterUserResponse>({
        url: `/2/users/by/username/${username}`,
        moduleName: this.MODULE_NAME,
      });

      this.logger.info(this.MODULE_NAME, "User retrieved successfully", {
        userId: response.data.id,
        username: response.data.username,
      });

      return response;
    } catch (error) {
      this.logger.error(this.MODULE_NAME, "Failed to get user", error);
      throw error;
    }
  }
}
