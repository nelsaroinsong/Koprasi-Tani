import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const client = new S3Client({
  region: process.env.R2_REGION || 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET = process.env.R2_BUCKET || 'koperasi-images';

const filesToUpload = [
  { key: 'landing/hero-tractor.jpg', localPath: path.resolve('public/landing/hero-tractor.jpg'), contentType: 'image/jpeg' },
  { key: 'landing/farmer-pruning.jpg', localPath: path.resolve('public/landing/farmer-pruning.jpg'), contentType: 'image/jpeg' },
  { key: 'landing/farmer-innovator.jpg', localPath: path.resolve('public/landing/farmer-innovator.jpg'), contentType: 'image/jpeg' },
  { key: 'landing/farmer-woman.jpg', localPath: path.resolve('public/landing/farmer-woman.jpg'), contentType: 'image/jpeg' },
  { key: 'landing/koperasi-full-dark.png', localPath: path.resolve('public/landing/koperasi-full-dark.png'), contentType: 'image/png' },
  { key: 'landing/koperasi-full-white.png', localPath: path.resolve('public/landing/koperasi-full-white.png'), contentType: 'image/png' },
  { key: 'landing/koperasi-logo-lime.png', localPath: path.resolve('public/landing/koperasi-logo-lime.png'), contentType: 'image/png' },
];

async function main() {
  console.log(`Uploading landing & brand images to Cloudflare R2 bucket: ${BUCKET}...`);

  for (const item of filesToUpload) {
    if (!fs.existsSync(item.localPath)) {
      console.error(`Local file not found: ${item.localPath}`);
      continue;
    }
    const fileBuffer = fs.readFileSync(item.localPath);
    console.log(`Uploading ${item.key} (${fileBuffer.length} bytes, ${item.contentType})...`);

    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: item.key,
        Body: fileBuffer,
        ContentType: item.contentType,
      })
    );
    console.log(`Uploaded: ${item.key}`);
  }

  console.log('\nVerifying objects in R2 under landing/:');
  const res = await client.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: 'landing/',
    })
  );
  if (res.Contents) {
    for (const c of res.Contents) {
      console.log(` - ${c.Key} (${c.Size} bytes)`);
    }
  } else {
    console.log('No objects found.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
