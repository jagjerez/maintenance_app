import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { IntegrationJob } from '@/models';
import { connectDB } from '@/lib/db';
import { put } from '@vercel/blob';
import { FileProcessor } from '@/lib/fileProcessor';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file || !type) {
      return NextResponse.json(
        { error: 'File and type are required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['locations', 'machine-models', 'machines', 'maintenance-ranges'];
    if (!allowedTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type' },
        { status: 400 }
      );
    }

    // Validate file extension
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only CSV and Excel files are allowed.' },
        { status: 400 }
      );
    }

    await connectDB();

    // Upload file to Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
    });

    // Create integration job record
    const job = new IntegrationJob({
      companyId: session.user.companyId,
      type,
      status: 'pending',
      fileName: file.name,
      fileUrl: blob.url,
      fileSize: file.size,
      totalRows: 0,
      processedRows: 0,
      successRows: 0,
      errorRows: 0,
      errors: [],
    });

    await job.save();

    // Start processing in background
    processFileInBackground(job._id.toString(), type, session.user.companyId, blob.url);

    return NextResponse.json({ 
      message: 'File uploaded successfully',
      jobId: job._id 
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// Background processing function
async function processFileInBackground(jobId: string, type: string, companyId: string, fileUrl: string) {
  try {
    const processor = new FileProcessor(jobId, type, companyId);
    await processor.processFile(fileUrl);
  } catch (error) {
    console.error('Error processing file in background:', error);
    // Update job status to failed
    try {
      await connectDB();
      await IntegrationJob.findByIdAndUpdate(jobId, { 
        status: 'failed',
        completedAt: new Date()
      });
    } catch (updateError) {
      console.error('Error updating job status to failed:', updateError);
    }
  }
}
