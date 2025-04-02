import type { Env } from "../types";

interface RateLimitConfig {
  maxRequests: number; // Maximum number of requests
  windowSeconds: number; // Time window (seconds)
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 1000, // Maximum 3 requests per time window
  windowSeconds: 60 * 60 * 12, // 6 hour time window
};

export class RateLimitService {
  private env: Env;
  private config: RateLimitConfig;

  constructor(env: Env, config: Partial<RateLimitConfig> = {}) {
    this.env = env;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if user has exceeded rate limit
   * @param userId User ID
   * @returns Whether the request is allowed
   */
  async isAllowed(userId: string): Promise<boolean> {
    const key = this.getKey(userId);
    const current = ((await this.env.KV.get(key, "json")) as number) || 0;

    if (current >= this.config.maxRequests) {
      return false;
    }

    // If this is the first request, set expiration time
    if (current === 0) {
      await this.env.KV.put(key, "1", {
        expirationTtl: this.config.windowSeconds,
      });
    } else {
      // Increment counter
      await this.env.KV.put(key, String(current + 1), {
        expirationTtl: this.config.windowSeconds,
      });
    }

    return true;
  }

  /**
   * Get current request count for a user
   * @param userId User ID
   * @returns Current request count
   */
  async getCurrentCount(userId: string): Promise<number> {
    const key = this.getKey(userId);
    return ((await this.env.KV.get(key, "json")) as number) || 0;
  }

  /**
   * Get remaining request count for a user
   * @param userId User ID
   * @returns Remaining request count
   */
  async getRemainingCount(userId: string): Promise<number> {
    const current = await this.getCurrentCount(userId);
    return Math.max(0, this.config.maxRequests - current);
  }

  /**
   * Reset request count for a user
   * @param userId User ID
   */
  async resetCount(userId: string): Promise<void> {
    const key = this.getKey(userId);
    await this.env.KV.delete(key);
  }

  /**
   * Generate key for KV storage
   * @param userId User ID
   * @returns KV key
   */
  private getKey(userId: string): string {
    return `rate_limit:${userId}`;
  }
}
