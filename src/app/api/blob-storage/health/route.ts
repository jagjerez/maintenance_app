import { NextResponse } from 'next/server';
import { getStorageType, isMinioAvailable } from '@/lib/blobStorage';

export async function GET() {
  try {
    const storageType = getStorageType();
    const isMinioOk = storageType === 'minio' ? await isMinioAvailable() : true;
    
    return NextResponse.json({
      storageType,
      status: isMinioOk ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      details: {
        minioAvailable: storageType === 'minio' ? isMinioOk : 'N/A',
        vercelBlobConfigured: storageType === 'vercel' ? !!process.env.APP_READ_WRITE_TOKEN : 'N/A',
      }
    });
  } catch (error) {
    console.error('Blob storage health check failed:', error);
    return NextResponse.json(
      { 
        storageType: getStorageType(),
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
