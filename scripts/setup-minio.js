#!/usr/bin/env node

/**
 * MinIO Setup Script
 * 
 * This script helps set up MinIO for local development by:
 * 1. Checking if MinIO is running
 * 2. Creating the required bucket
 * 3. Setting up proper permissions
 */

import Minio from 'minio';

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
const MINIO_PORT = parseInt(process.env.MINIO_PORT || '9000');
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true';
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'minioadmin';
const MINIO_BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'maintenance-app';

const client = new Minio.Client({
  endPoint: MINIO_ENDPOINT,
  port: MINIO_PORT,
  useSSL: MINIO_USE_SSL,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});

async function checkMinioConnection() {
  try {
    console.log('🔍 Checking MinIO connection...');
    await client.bucketExists('test-connection');
    console.log('✅ MinIO is running and accessible');
    return true;
  } catch (error) {
    console.error('❌ MinIO connection failed:', error.message);
    console.log('\n💡 Make sure MinIO is running:');
    console.log('   docker-compose up -d');
    return false;
  }
}

async function createBucket() {
  try {
    console.log(`🔍 Checking if bucket '${MINIO_BUCKET_NAME}' exists...`);
    const bucketExists = await client.bucketExists(MINIO_BUCKET_NAME);
    
    if (bucketExists) {
      console.log(`✅ Bucket '${MINIO_BUCKET_NAME}' already exists`);
      return true;
    }

    console.log(`📦 Creating bucket '${MINIO_BUCKET_NAME}'...`);
    await client.makeBucket(MINIO_BUCKET_NAME, 'us-east-1');
    console.log(`✅ Bucket '${MINIO_BUCKET_NAME}' created successfully`);
    return true;
  } catch (error) {
    console.error('❌ Failed to create bucket:', error.message);
    return false;
  }
}

async function setBucketPolicy() {
  try {
    console.log('🔧 Setting bucket policy for public read access...');
    
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${MINIO_BUCKET_NAME}/*`]
        }
      ]
    };

    await client.setBucketPolicy(MINIO_BUCKET_NAME, JSON.stringify(policy));
    console.log('✅ Bucket policy set successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to set bucket policy:', error.message);
    return false;
  }
}

async function testUpload() {
  try {
    console.log('🧪 Testing file upload...');
    
    const testContent = 'Hello MinIO! This is a test file.';
    const testFilename = 'test-upload.txt';
    
    await client.putObject(MINIO_BUCKET_NAME, testFilename, testContent, {
      'Content-Type': 'text/plain',
    });
    
    console.log('✅ Test upload successful');
    
    // Clean up test file
    await client.removeObject(MINIO_BUCKET_NAME, testFilename);
    console.log('🧹 Test file cleaned up');
    
    return true;
  } catch (error) {
    console.error('❌ Test upload failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 MinIO Setup Script');
  console.log('====================\n');
  
  console.log(`Configuration:`);
  console.log(`  Endpoint: ${MINIO_ENDPOINT}:${MINIO_PORT}`);
  console.log(`  SSL: ${MINIO_USE_SSL}`);
  console.log(`  Bucket: ${MINIO_BUCKET_NAME}\n`);

  const connectionOk = await checkMinioConnection();
  if (!connectionOk) {
    process.exit(1);
  }

  const bucketOk = await createBucket();
  if (!bucketOk) {
    process.exit(1);
  }

  const policyOk = await setBucketPolicy();
  if (!policyOk) {
    console.log('⚠️  Bucket policy setup failed, but continuing...');
  }

  const testOk = await testUpload();
  if (!testOk) {
    process.exit(1);
  }

  console.log('\n🎉 MinIO setup completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Set BLOB_STORAGE_TYPE=minio in your .env.local');
  console.log('2. Start your Next.js application: npm run dev');
  console.log('3. Access MinIO console at: http://localhost:9001');
  console.log('   Username: minioadmin');
  console.log('   Password: minioadmin');
}

main().catch(console.error);
