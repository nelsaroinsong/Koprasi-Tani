import { ConfigService } from '@nestjs/config';
export declare class StorageService {
    private configService;
    private client;
    private bucket;
    constructor(configService: ConfigService);
    uploadFile(key: string, body: Buffer | Uint8Array, contentType?: string): Promise<import("@aws-sdk/client-s3").PutObjectCommandOutput>;
    getPresignedUploadUrl(key: string, contentType?: string, expiresIn?: number): Promise<{
        url: string;
        key: string;
        bucket: string;
        expiresIn: number;
    }>;
    getPresignedDownloadUrl(key: string, expiresIn?: number): Promise<string>;
    deleteFile(key: string): Promise<import("@aws-sdk/client-s3").DeleteObjectCommandOutput>;
    listFiles(prefix?: string): Promise<import("@aws-sdk/client-s3")._Object[]>;
}
