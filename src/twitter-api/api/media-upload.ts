import { Logger, defaultLogger } from "../common/logger.js";

interface TwitterMediaUploadOptions {
  bearerToken: string;
  mediaType: string;
  mediaCategory: string;
  logger?: Logger;
}

interface InitResponse {
  data: {
    id: string;
    expires_after_secs: number;
  };
}

/**
 * Twitter Media Upload API client
 */
export class TwitterMediaUploader {
  private bearerToken: string;
  private baseUrl = "https://api.twitter.com";
  private logger: Logger;
  private MODULE_NAME = "MediaUploader";

  constructor(options: TwitterMediaUploadOptions) {
    this.bearerToken = options.bearerToken;
    this.logger = options.logger || defaultLogger;
    this.logger.info(this.MODULE_NAME, "TwitterMediaUploader initialized");
  }

  /**
   * Get media upload status
   * @param mediaId Media ID
   * @returns Upload status information
   */
  async getMediaUploadStatus(mediaId: string): Promise<any> {
    const method = "GET";
    const url = `${this.baseUrl}/2/media/upload?media_id=${mediaId}&command=STATUS`;

    this.logger.logRequest(this.MODULE_NAME, method, url, {
      Authorization: "Bearer [REDACTED]",
    });

    const startTime = Date.now();
    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.bearerToken}`,
        },
      });

      if (!response.ok) {
        const errorMsg = `Failed to get media status: ${response.status} ${response.statusText}`;
        this.logger.logApiError(this.MODULE_NAME, method, url, {
          status: response.status,
          statusText: response.statusText,
        });
        throw new Error(errorMsg);
      }

      const data = await response.json();
      this.logger.logResponse(
        this.MODULE_NAME,
        method,
        url,
        response.status,
        data
      );
      this.logger.logPerformance(
        this.MODULE_NAME,
        "getMediaUploadStatus",
        startTime
      );

      return data;
    } catch (error) {
      this.logger.logApiError(this.MODULE_NAME, method, url, error);
      throw error;
    }
  }

  /**
   * Initialize media upload
   */
  async initUpload(
    totalBytes: number,
    segmentIndex: number = 123
  ): Promise<InitResponse> {
    const form = new FormData();
    form.append("segment_index", segmentIndex.toString());

    const method = "POST";
    const url = `${this.baseUrl}/2/media/upload?total_bytes=${totalBytes}&command=INIT`;
    const headers = {
      Authorization: `Bearer ${this.bearerToken}`,
    };

    this.logger.logRequest(this.MODULE_NAME, method, url, {
      Authorization: "Bearer [REDACTED]",
      totalBytes,
    });

    const startTime = Date.now();
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: form,
      });

      if (!response.ok) {
        const errorMsg = `INIT failed: ${response.status} ${response.statusText}`;
        this.logger.logApiError(this.MODULE_NAME, method, url, {
          status: response.status,
          statusText: response.statusText,
        });
        throw new Error(errorMsg);
      }

      const data = await response.json();
      this.logger.logResponse(
        this.MODULE_NAME,
        method,
        url,
        response.status,
        data
      );
      this.logger.logPerformance(this.MODULE_NAME, "initUpload", startTime);

      return data as InitResponse;
    } catch (error) {
      this.logger.logApiError(this.MODULE_NAME, method, url, error);
      throw error;
    }
  }

  /**
   * Append media chunks to the upload
   */
  async appendMedia(
    mediaId: string,
    mediaType: string,
    mediaBuffer: Uint8Array,
    mediaCategory: string,
    segmentIndex: number
  ): Promise<void> {
    const form = new FormData();
    form.append("segment_index", segmentIndex.toString());

    // Convert Uint8Array to Blob for FormData
    const blob = new Blob([mediaBuffer]);
    form.append("media", blob);

    const method = "POST";
    const url = `${this.baseUrl}/2/media/upload?media_id=${mediaId}&command=APPEND&media_type=${mediaType}&media_category=${mediaCategory}`;

    this.logger.logRequest(this.MODULE_NAME, method, url, {
      Authorization: "Bearer [REDACTED]",
      mediaId,
      mediaType,
      mediaCategory,
      segmentIndex,
      bufferSize: mediaBuffer.length,
    });

    const startTime = Date.now();
    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.bearerToken}`,
        },
        body: form,
      });

      if (!response.ok) {
        const errorMsg = `APPEND failed: ${response.status} ${response.statusText}`;
        this.logger.logApiError(this.MODULE_NAME, method, url, {
          status: response.status,
          statusText: response.statusText,
        });
        throw new Error(errorMsg);
      }

      this.logger.logResponse(this.MODULE_NAME, method, url, response.status);
      this.logger.logPerformance(this.MODULE_NAME, "appendMedia", startTime);
    } catch (error) {
      this.logger.logApiError(this.MODULE_NAME, method, url, error);
      throw error;
    }
  }

  /**
   * Finalize the media upload
   */
  async finalizeUpload(mediaId: string, mediaCategory: string): Promise<any> {
    const form = new FormData();

    const method = "POST";
    const url = `${this.baseUrl}/2/media/upload?media_id=${mediaId}&command=FINALIZE&media_category=${mediaCategory}`;

    this.logger.logRequest(this.MODULE_NAME, method, url, {
      Authorization: "Bearer [REDACTED]",
      mediaId,
      mediaCategory,
    });

    const startTime = Date.now();
    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.bearerToken}`,
        },
        body: form,
      });

      if (!response.ok) {
        const errorMsg = `FINALIZE failed: ${response.status} ${response.statusText}`;
        this.logger.logApiError(this.MODULE_NAME, method, url, {
          status: response.status,
          statusText: response.statusText,
        });
        throw new Error(errorMsg);
      }

      let data = null;
      if (response.status !== 204) {
        data = await response.json();
      }

      this.logger.logResponse(
        this.MODULE_NAME,
        method,
        url,
        response.status,
        data
      );
      this.logger.logPerformance(this.MODULE_NAME, "finalizeUpload", startTime);

      return data;
    } catch (error) {
      this.logger.logApiError(this.MODULE_NAME, method, url, error);
      throw error;
    }
  }

  /**
   * Upload a media file to Twitter
   */
  async uploadMedia(
    fileInput: Uint8Array | File,
    mediaType: string,
    mediaCategory: string
  ): Promise<string> {
    const startTime = Date.now();
    this.logger.info(this.MODULE_NAME, "Starting media upload", {
      mediaType,
      mediaCategory,
    });

    try {
      let fileBuffer: Uint8Array;
      let fileSize: number;

      if (fileInput instanceof Uint8Array) {
        // If input is already a Uint8Array
        this.logger.debug(this.MODULE_NAME, "Using provided Uint8Array");
        fileBuffer = fileInput;
      } else if (typeof File !== "undefined" && fileInput instanceof File) {
        // If input is a File object (browser environment)
        this.logger.debug(this.MODULE_NAME, "Converting File to Uint8Array", {
          fileName: fileInput.name,
          fileSize: fileInput.size,
        });
        const arrayBuffer = await fileInput.arrayBuffer();
        fileBuffer = new Uint8Array(arrayBuffer);
      } else {
        this.logger.error(this.MODULE_NAME, "Invalid file input type");
        throw new Error("Invalid file input type");
      }

      fileSize = fileBuffer.length;
      this.logger.debug(this.MODULE_NAME, "File buffer prepared", { fileSize });

      // Initialize upload
      this.logger.info(this.MODULE_NAME, "Initializing upload", { fileSize });
      const initResponse = await this.initUpload(fileSize);
      const mediaId = initResponse.data.id;
      this.logger.info(this.MODULE_NAME, "Upload initialized", { mediaId });

      // Append media data (for larger files, this should be split into chunks)
      this.logger.info(this.MODULE_NAME, "Appending media data");
      await this.appendMedia(mediaId, mediaType, fileBuffer, mediaCategory, 0);
      this.logger.info(this.MODULE_NAME, "Media data appended");

      // Finalize upload
      this.logger.info(this.MODULE_NAME, "Finalizing upload", { mediaId });
      const finalizeResponse = await this.finalizeUpload(
        mediaId,
        mediaCategory
      );
      this.logger.info(this.MODULE_NAME, "Upload finalized", {
        finalizeResponse,
      });

      this.logger.logPerformance(this.MODULE_NAME, "uploadMedia", startTime);
      return mediaId;
    } catch (error) {
      this.logger.error(this.MODULE_NAME, "Error uploading media", error);
      throw error;
    }
  }
}
