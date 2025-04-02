import { defaultLogger, Logger } from "./logger";

export interface HttpClientOptions {
  baseUrl: string;
  bearerToken: string;
  logger?: Logger;
}

export interface HttpRequestOptions {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
  queryParams?: Record<string, string>;
  moduleName: string;
}

/**
 * HTTP client class for handling API requests
 */
export class HttpClient {
  private baseUrl: string;
  private bearerToken: string;
  private logger: Logger;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl;
    this.bearerToken = options.bearerToken;
    this.logger = options.logger || defaultLogger;
  }

  /**
   * Build complete URL
   */
  private buildUrl(url: string, queryParams?: Record<string, string>): string {
    // If URL is absolute path, use it directly; otherwise append to baseUrl
    const fullUrl = url.startsWith("http") ? url : `${this.baseUrl}${url}`;

    // If query parameters exist, add them to URL
    if (queryParams && Object.keys(queryParams).length > 0) {
      const urlObj = new URL(fullUrl);
      Object.entries(queryParams).forEach(([key, value]) => {
        urlObj.searchParams.append(key, value);
      });
      return urlObj.toString();
    }

    return fullUrl;
  }

  /**
   * Build request headers
   */
  private buildHeaders(
    headers?: Record<string, string>
  ): Record<string, string> {
    const defaultHeaders: Record<string, string> = {
      Authorization: `Bearer ${this.bearerToken}`,
    };

    return { ...defaultHeaders, ...headers };
  }

  /**
   * Send HTTP request
   */
  async request<T>(options: HttpRequestOptions): Promise<T> {
    const { method, url, headers, body, queryParams, moduleName } = options;

    const fullUrl = this.buildUrl(url, queryParams);
    const requestHeaders = this.buildHeaders(headers);

    // Log request
    this.logger.logRequest(
      moduleName,
      method,
      fullUrl,
      { ...requestHeaders, Authorization: "Bearer [REDACTED]" },
      body
    );

    const startTime = Date.now();

    try {
      // Build request configuration
      const requestInit: RequestInit = {
        method,
        headers: requestHeaders,
      };

      // If request body exists, add it to the request
      if (body) {
        if (body instanceof FormData) {
          requestInit.body = body;
        } else if (typeof body === "object") {
          requestInit.headers = {
            ...requestInit.headers,
            "Content-Type": "application/json",
          };
          requestInit.body = JSON.stringify(body);
        } else {
          requestInit.body = body;
        }
      }

      // Send request
      const response = await fetch(fullUrl, requestInit);

      // Check response status
      if (!response.ok) {
        const error = {
          status: response.status,
          statusText: response.statusText,
          url: fullUrl,
        };

        this.logger.logApiError(moduleName, method, fullUrl, error);
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`
        );
      }

      // Process response
      let responseData: any = null;

      // If status code is not 204, parse response content
      if (response.status !== 204) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }
      }

      // Log response
      this.logger.logResponse(
        moduleName,
        method,
        fullUrl,
        response.status,
        responseData
      );

      // Log performance
      this.logger.logPerformance(moduleName, `${method} ${url}`, startTime);

      return responseData as T;
    } catch (error) {
      // Log error
      this.logger.logApiError(moduleName, method, fullUrl, error);

      // Re-throw error
      throw error;
    }
  }

  /**
   * Send GET request
   */
  async get<T>(
    options: Omit<HttpRequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>({
      ...options,
      method: "GET",
    });
  }

  /**
   * Send POST request
   */
  async post<T>(options: Omit<HttpRequestOptions, "method">): Promise<T> {
    return this.request<T>({
      ...options,
      method: "POST",
    });
  }

  /**
   * Send PUT request
   */
  async put<T>(options: Omit<HttpRequestOptions, "method">): Promise<T> {
    return this.request<T>({
      ...options,
      method: "PUT",
    });
  }

  /**
   * Send DELETE request
   */
  async delete<T>(
    options: Omit<HttpRequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>({
      ...options,
      method: "DELETE",
    });
  }
}
