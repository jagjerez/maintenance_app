import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { IntegrationJob } from '@/models';
import { connectDB } from '@/lib/db';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const type = formData.get('type') as string;

    if (!files || files.length === 0 || !type) {
      return NextResponse.json(
        { error: 'Files and type are required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['locations', 'machine-models', 'machines', 'maintenance-ranges', 'operations'];
    if (!allowedTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type' },
        { status: 400 }
      );
    }

    // Validate file extensions
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    for (const file of files) {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedExtensions.includes(fileExtension)) {
        return NextResponse.json(
          { error: `Invalid file type for ${file.name}. Only CSV and Excel files are allowed.` },
          { status: 400 }
        );
      }
    }

    await connectDB();

    const jobIds: string[] = [];

    // Process each file - only create jobs, don't process them
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Upload file to Vercel Blob
      const blob = await put(`${Date.now()}-${file.name}`, file, {
        access: 'public',
        addRandomSuffix: true, // Generate unique filename to avoid conflicts
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
        limitedRows: 0,
        errors: [],
      });

      await job.save();
      jobIds.push(job._id.toString());
    }

    return NextResponse.json({ 
      message: `${files.length} file(s) uploaded successfully`,
      jobIds 
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    );
  }
}