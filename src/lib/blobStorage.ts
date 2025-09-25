import { put as vercelPut } from '@vercel/blob';
import * as Minio from 'minio';

// Environment configuration
const BLOB_STORAGE_TYPE = process.env.BLOB_STORAGE_TYPE || 'vercel'; // 'vercel' or 'minio'
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
const MINIO_PORT = parseInt(process.env.MINIO_PORT || '9000');
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true';
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'minioadmin';
const MINIO_BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'maintenance-app';

// MinIO client instance
let minioClient: Minio.Client | null = null;

function getMinioClient(): Minio.Client {
  if (!minioClient) {
    minioClient = new Minio.Client({
      endPoint: MINIO_ENDPOINT,
      port: MINIO_PORT,
      useSSL: MINIO_USE_SSL,
      accessKey: MINIO_ACCESS_KEY,
      secretKey: MINIO_SECRET_KEY,
    });
  }
  return minioClient;
}

// Ensure MinIO bucket exists
async function ensureBucketExists(): Promise<void> {
  if (BLOB_STORAGE_TYPE !== 'minio') return;
  
  const client = getMinioClient();
  const bucketExists = await client.bucketExists(MINIO_BUCKET_NAME);
  
  if (!bucketExists) {
    await client.makeBucket(MINIO_BUCKET_NAME, 'us-east-1');
    console.log(`Created MinIO bucket: ${MINIO_BUCKET_NAME}`);
  }
}

// Initialize MinIO on startup
if (BLOB_STORAGE_TYPE === 'minio') {
  ensureBucketExists().catch(console.error);
}

export interface BlobUploadResult {
  url: string;
  filename: string;
  size: number;
  type: string;
}

export interface BlobUploadOptions {
  access?: 'public' | 'private';
  addRandomSuffix?: boolean;
}

/**
 * Upload a file to blob storage (Vercel Blob or MinIO)
 */
export async function uploadBlob(
  filename: string,
  file: File | Buffer,
  options: BlobUploadOptions = {}
): Promise<BlobUploadResult> {
  const { access = 'public', addRandomSuffix = false } = options;
  
  if (BLOB_STORAGE_TYPE === 'minio') {
    return uploadToMinio(filename, file, addRandomSuffix);
  } else {
    return uploadToVercel(filename, file, access, addRandomSuffix);
  }
}

/**
 * Upload to Vercel Blob
 */
async function uploadToVercel(
  filename: string,
  file: File | Buffer,
  access: 'public' | 'private',
  addRandomSuffix: boolean
): Promise<BlobUploadResult> {
  const blob = await vercelPut(filename, file, {
    access: access === 'private' ? 'public' : access, // Vercel blob only supports 'public' access
    addRandomSuffix,
  });

  return {
    url: blob.url,
    filename: blob.pathname.split('/').pop() || filename,
    size: file instanceof File ? file.size : file.length,
    type: file instanceof File ? file.type : 'application/octet-stream',
  };
}

/**
 * Upload to MinIO
 */
async function uploadToMinio(
  filename: string,
  file: File | Buffer,
  addRandomSuffix: boolean
): Promise<BlobUploadResult> {
  await ensureBucketExists();
  
  const client = getMinioClient();
  
  // Generate unique filename if needed
  let finalFilename = filename;
  if (addRandomSuffix) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = filename.split('.').pop();
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    finalFilename = `${nameWithoutExt}-${timestamp}-${randomString}.${extension}`;
  }

  // Convert File to Buffer if needed
  let buffer: Buffer;
  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    buffer = file;
  }

  // Upload to MinIO
  await client.putObject(
    MINIO_BUCKET_NAME, 
    finalFilename, 
    buffer, 
    buffer.length,
    {
      'Content-Type': file instanceof File ? file.type : 'application/octet-stream',
    }
  );

  // Generate public URL (MinIO doesn't have public URLs by default, so we construct one)
  const protocol = MINIO_USE_SSL ? 'https' : 'http';
  const url = `${protocol}://${MINIO_ENDPOINT}:${MINIO_PORT}/${MINIO_BUCKET_NAME}/${finalFilename}`;

  return {
    url,
    filename: finalFilename,
    size: buffer.length,
    type: file instanceof File ? file.type : 'application/octet-stream',
  };
}

/**
 * Delete a file from blob storage
 */
export async function deleteBlob(filename: string): Promise<void> {
  if (BLOB_STORAGE_TYPE === 'minio') {
    const client = getMinioClient();
    await client.removeObject(MINIO_BUCKET_NAME, filename);
  } else {
    // Vercel Blob doesn't have a direct delete method in the client
    // You would need to implement this using the Vercel Blob API
    console.warn('Delete functionality not implemented for Vercel Blob');
  }
}

/**
 * Get the storage type being used
 */
export function getStorageType(): string {
  return BLOB_STORAGE_TYPE;
}

/**
 * Check if MinIO is available
 */
export async function isMinioAvailable(): Promise<boolean> {
  if (BLOB_STORAGE_TYPE !== 'minio') return false;
  
  try {
    const client = getMinioClient();
    await client.bucketExists(MINIO_BUCKET_NAME);
    return true;
  } catch (error) {
    console.error('MinIO not available:', error);
    return false;
  }
}
