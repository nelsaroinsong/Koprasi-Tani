import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private client: S3Client;
  private bucket: string;

  constructor(private configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID') || '';
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY') || '';
    const endpoint = this.configService.get<string>('R2_ENDPOINT') || '';
    const region = this.configService.get<string>('R2_REGION') || 'auto';
    this.bucket = this.configService.get<string>('R2_BUCKET') || 'koperasi-images';

    this.client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async uploadFile(key: string, body: Buffer | Uint8Array, contentType?: string) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });
    return await this.client.send(command);
  }

  async getPresignedUploadUrl(key: string, contentType?: string, expiresIn = 3600) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(this.client, command, { expiresIn });
    return { url, key, bucket: this.bucket, expiresIn };
  }

  async getPresignedDownloadUrl(key: string, expiresIn = 3600) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return await getSignedUrl(this.client, command, { expiresIn });
  }

  async deleteFile(key: string) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return await this.client.send(command);
  }

  async listFiles(prefix = '') {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
    });
    const response = await this.client.send(command);
    return response.Contents || [];
  }
}
