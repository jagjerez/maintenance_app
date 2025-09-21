import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import QueueManager from '@/lib/queueManager';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    const queueManager = QueueManager.getInstance();
    const stats = await queueManager.getJobStats(session.user.companyId, days);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting integration stats:', error);
    return NextResponse.json(
      { error: 'Failed to get integration stats' },
      { status: 500 }
    );
  }
}
