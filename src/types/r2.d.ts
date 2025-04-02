/**
 * Type definitions for Cloudflare R2
 */

interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
  put(
    key: string,
    value:
      | ReadableStream
      | ArrayBuffer
      | ArrayBufferView
      | string
      | null
      | Blob,
    options?: R2PutOptions
  ): Promise<R2Object>;
  delete(key: string | string[]): Promise<void>;
  list(options?: R2ListOptions): Promise<R2Objects>;
}

interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: Date;
  httpMetadata?: R2HttpMetadata;
  customMetadata?: Record<string, string>;
}

interface R2ObjectBody extends R2Object {
  body: ReadableStream;
  bodyUsed: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json<T>(): Promise<T>;
  blob(): Promise<Blob>;
}

interface R2HttpMetadata {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
  cacheExpiry?: Date;
}

interface R2PutOptions {
  httpMetadata?: R2HttpMetadata;
  customMetadata?: Record<string, string>;
  md5?: ArrayBuffer | string;
}

interface R2ListOptions {
  limit?: number;
  prefix?: string;
  cursor?: string;
  delimiter?: string;
  include?: R2ListInclude[];
}

enum R2ListInclude {
  httpMetadata = "httpMetadata",
  customMetadata = "customMetadata",
}

interface R2Objects {
  objects: R2Object[];
  truncated: boolean;
  cursor?: string;
  delimitedPrefixes: string[];
}
