import { NextRequest, NextResponse } from 'next/server';
import LocalCron from '@/lib/localCron';

export async function GET(_request: NextRequest) {
  try {
    const localCron = LocalCron.getInstance();
    
    return NextResponse.json({
      isActive: localCron.isActive(),
      message: localCron.isActive() ? 'Local cron is running' : 'Local cron is stopped'
    });

  } catch (error) {
    console.error('Error checking local cron status:', error);
    return NextResponse.json(
      { error: 'Failed to check local cron status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    const localCron = LocalCron.getInstance();

    switch (action) {
      case 'start':
        localCron.start(2); // Start with 2-minute interval
        return NextResponse.json({
          message: 'Local cron started',
          isActive: true
        });

      case 'stop':
        localCron.stop();
        return NextResponse.json({
          message: 'Local cron stopped',
          isActive: false
        });

      case 'process':
        await localCron.processJobsNow();
        return NextResponse.json({
          message: 'Jobs processed manually',
          isActive: localCron.isActive()
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, stop, or process' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error controlling local cron:', error);
    return NextResponse.json(
      { error: 'Failed to control local cron' },
      { status: 500 }
    );
  }
}
