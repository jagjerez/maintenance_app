import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { IntegrationJob } from '@/models';
import { connectDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    await connectDB();

    const totalItems = await IntegrationJob.countDocuments({ companyId: session.user.companyId });
    const totalPages = Math.ceil(totalItems / limit);

    const jobs = await IntegrationJob.find({ companyId: session.user.companyId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      jobs,
      totalItems,
      totalPages,
      currentPage: page,
      itemsPerPage: limit
    });
  } catch (error) {
    console.error('Error fetching integration jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integration jobs' },
      { status: 500 }
    );
  }
}
