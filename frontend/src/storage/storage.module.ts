import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Configuration from environment variables
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_ENDPOINT = process.env.R2_ENDPOINT || '';
export const R2_BUCKET = process.env.R2_BUCKET || 'koperasi-images';
export const R2_REGION = process.env.R2_REGION || 'auto';

/**
 * S3 Client instance configured for Cloudflare R2
 */
export const r2Client = new S3Client({
  region: R2_REGION,
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export interface UploadOptions {
  bucket?: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

/**
 * Storage Service containing utility functions for Cloudflare R2 / S3 operations
 */
export class StorageService {
  private client: S3Client;
  private defaultBucket: string;

  constructor(client: S3Client = r2Client, defaultBucket: string = R2_BUCKET) {
    this.client = client;
    this.defaultBucket = defaultBucket;
  }

  /**
   * Uploads a file buffer, string, or Uint8Array directly to R2
   */
  async uploadFile(
    key: string,
    fileBuffer: Buffer | Uint8Array | string,
    options?: UploadOptions
  ) {
    const bucket = options?.bucket || this.defaultBucket;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: options?.contentType,
      Metadata: options?.metadata,
    });

    const result = await this.client.send(command);
    return {
      key,
      bucket,
      etag: result.ETag,
      url: `${R2_ENDPOINT}/${bucket}/${key}`,
    };
  }

  /**
   * Generates a pre-signed URL for direct client-side upload (PUT)
   */
  async getPresignedUploadUrl(
    key: string,
    contentType?: string,
    expiresIn = 3600,
    bucket: string = this.defaultBucket
  ) {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(this.client, command, { expiresIn });
    return {
      signedUrl,
      key,
      bucket,
      expiresIn,
    };
  }

  /**
   * Generates a pre-signed URL for downloading/viewing a private file (GET)
   */
  async getPresignedDownloadUrl(
    key: string,
    expiresIn = 3600,
    bucket: string = this.defaultBucket
  ) {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Deletes a file from R2
   */
  async deleteFile(key: string, bucket: string = this.defaultBucket) {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    return await this.client.send(command);
  }

  /**
   * Checks if an object exists in R2
   */
  async checkFileExists(key: string, bucket: string = this.defaultBucket): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Lists files in the bucket with an optional prefix
   */
  async listFiles(prefix = '', maxKeys = 100, bucket: string = this.defaultBucket) {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: maxKeys,
    });

    const response = await this.client.send(command);
    return {
      contents: response.Contents || [],
      isTruncated: response.IsTruncated,
      nextContinuationToken: response.NextContinuationToken,
    };
  }
}

// Default singleton instance
export const storageService = new StorageService();

/**
 * StorageModule object export providing all essential methods
 */
export const StorageModule = {
  client: r2Client,
  service: storageService,
  uploadFile: (key: string, fileBuffer: Buffer | Uint8Array | string, options?: UploadOptions) =>
    storageService.uploadFile(key, fileBuffer, options),
  getPresignedUploadUrl: (key: string, contentType?: string, expiresIn?: number, bucket?: string) =>
    storageService.getPresignedUploadUrl(key, contentType, expiresIn, bucket),
  getPresignedDownloadUrl: (key: string, expiresIn?: number, bucket?: string) =>
    storageService.getPresignedDownloadUrl(key, expiresIn, bucket),
  deleteFile: (key: string, bucket?: string) => storageService.deleteFile(key, bucket),
  checkFileExists: (key: string, bucket?: string) => storageService.checkFileExists(key, bucket),
  listFiles: (prefix?: string, maxKeys?: number, bucket?: string) =>
    storageService.listFiles(prefix, maxKeys, bucket),
};

export default StorageModule;
