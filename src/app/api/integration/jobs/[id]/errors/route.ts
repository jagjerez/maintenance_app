import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { IntegrationJob } from '@/models';
import { connectDB } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const job = await IntegrationJob.findOne({
      _id: params.id,
      companyId: session.user.companyId,
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({
      errors: job.errors,
      totalErrors: job.errorRows,
      successRows: job.successRows,
      totalRows: job.totalRows,
    });
  } catch (error) {
    console.error('Error fetching job errors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job errors' },
      { status: 500 }
    );
  }
}
