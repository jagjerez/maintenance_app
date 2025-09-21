import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { IntegrationJob } from '@/models';
import { connectDB } from '@/lib/db';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get stuck jobs (processing for more than 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const stuckJobs = await IntegrationJob.find({
      companyId: session.user.companyId,
      status: 'processing',
      updatedAt: { $lt: tenMinutesAgo }
    });

    // Get all jobs by status
    const jobsByStatus = await IntegrationJob.aggregate([
      { $match: { companyId: session.user.companyId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get recent jobs
    const recentJobs = await IntegrationJob.find({
      companyId: session.user.companyId
    }).sort({ createdAt: -1 }).limit(10).select('_id fileName status createdAt updatedAt');

    return NextResponse.json({
      stuckJobs: stuckJobs.map(job => ({
        id: job._id,
        fileName: job.fileName,
        type: job.type,
        status: job.status,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        stuckForMinutes: Math.floor((Date.now() - job.updatedAt.getTime()) / (1000 * 60))
      })),
      jobsByStatus: jobsByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>),
      recentJobs: recentJobs.map(job => ({
        id: job._id,
        fileName: job.fileName,
        status: job.status,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      }))
    });

  } catch (error) {
    console.error('Error diagnosing integration jobs:', error);
    return NextResponse.json(
      { error: 'Failed to diagnose integration jobs' },
      { status: 500 }
    );
  }
}
