import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const client = new S3Client({
  region: process.env.R2_REGION || 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET || 'koperasi-images';

const filesToUpload = [
  {
    key: 'categories/semua-alat.jpg',
    localPath: 'C:\\Users\\ADVAN\\.gemini\\antigravity\\brain\\9333a048-de99-415e-85ec-d642217a2224\\semua_alat_icon_clean_1792489666113.jpg',
  },
  {
    key: 'categories/alat.jpg',
    localPath: path.resolve('public/categories/alat.jpg'),
  },
  {
    key: 'categories/all.jpg',
    localPath: path.resolve('public/categories/all.jpg'),
  },
  {
    key: 'categories/jagung.jpg',
    localPath: path.resolve('public/categories/jagung.jpg'),
  },
  {
    key: 'categories/kelapa.jpg',
    localPath: path.resolve('public/categories/kelapa.jpg'),
  },
  {
    key: 'categories/olahan.jpg',
    localPath: path.resolve('public/categories/olahan.jpg'),
  },
  {
    key: 'categories/turunan.jpg',
    localPath: path.resolve('public/categories/turunan.jpg'),
  },
];

async function main() {
  console.log(`Starting upload to Cloudflare R2 bucket: ${BUCKET}...`);

  for (const item of filesToUpload) {
    if (!fs.existsSync(item.localPath)) {
      console.error(`Local file not found: ${item.localPath}`);
      continue;
    }
    const fileBuffer = fs.readFileSync(item.localPath);
    console.log(`Uploading ${item.key} (${fileBuffer.length} bytes)...`);

    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: item.key,
        Body: fileBuffer,
        ContentType: 'image/jpeg',
      })
    );
    console.log(`Successfully uploaded: ${item.key}`);
  }

  console.log('\nVerifying objects in R2 under categories/:');
  const res = await client.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: 'categories/',
    })
  );
  if (res.Contents) {
    res.Contents.forEach((c) => {
      console.log(` - ${c.Key} (${c.Size} bytes)`);
    });
  } else {
    console.log('No objects found.');
  }
}

main().catch(console.error);
