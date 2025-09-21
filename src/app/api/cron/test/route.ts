import { NextRequest, NextResponse } from 'next/server';
import { IntegrationJob } from '@/models';
import { connectDB } from '@/lib/db';

export async function GET(_request: NextRequest) {
  try {
    await connectDB();

    // Get all pending jobs
    const pendingJobs = await IntegrationJob.find({ 
      status: 'pending' 
    }).sort({ createdAt: 1 }).limit(10);

    // Get jobs by status
    const jobsByStatus = await IntegrationJob.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get recent jobs
    const recentJobs = await IntegrationJob.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('_id fileName status companyId createdAt updatedAt');

    return NextResponse.json({
      message: 'Cron test endpoint working',
      timestamp: new Date().toISOString(),
      pendingJobs: pendingJobs.length,
      jobsByStatus: jobsByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>),
      recentJobs: recentJobs.map(job => ({
        id: job._id,
        fileName: job.fileName,
        status: job.status,
        companyId: job.companyId,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      })),
      nextJobsToProcess: pendingJobs.slice(0, 5).map(job => ({
        id: job._id,
        fileName: job.fileName,
        type: job.type,
        companyId: job.companyId,
        createdAt: job.createdAt
      }))
    });

  } catch (error) {
    console.error('Error in cron test:', error);
    return NextResponse.json(
      { 
        error: 'Failed to test cron',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Manual trigger for testing
export async function POST(_request: NextRequest) {
  try {
    // Call the actual cron job
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/cron/process-integration-jobs`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'test-secret'}`
      }
    });

    const result = await response.json();

    return NextResponse.json({
      message: 'Manual cron trigger executed',
      cronResult: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error triggering manual cron:', error);
    return NextResponse.json(
      { 
        error: 'Failed to trigger manual cron',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
