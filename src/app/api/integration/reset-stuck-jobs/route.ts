import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { IntegrationJob } from '@/models';
import { connectDB } from '@/lib/db';

export async function POST(_request: NextRequest) {
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

    if (stuckJobs.length === 0) {
      return NextResponse.json({
        message: 'No stuck jobs found',
        resetJobs: []
      });
    }

    // Reset stuck jobs to pending
    const resetResult = await IntegrationJob.updateMany(
      {
        _id: { $in: stuckJobs.map(job => job._id) }
      },
      {
        $set: {
          status: 'pending',
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({
      message: `Reset ${resetResult.modifiedCount} stuck jobs to pending`,
      resetJobs: stuckJobs.map(job => ({
        id: job._id,
        fileName: job.fileName,
        type: job.type
      }))
    });

  } catch (error) {
    console.error('Error resetting stuck jobs:', error);
    return NextResponse.json(
      { error: 'Failed to reset stuck jobs' },
      { status: 500 }
    );
  }
}
