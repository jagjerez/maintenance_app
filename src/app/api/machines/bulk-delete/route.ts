import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import { Machine } from '@/models';
import { authOptions } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'No IDs provided' },
        { status: 400 }
      );
    }

    // Verify all machines belong to the user's company
    const machines = await Machine.find({
      _id: { $in: ids },
      companyId: session.user.companyId
    });

    if (machines.length !== ids.length) {
      return NextResponse.json(
        { error: 'Some machines not found or not authorized' },
        { status: 400 }
      );
    }

    // Delete all machines
    const result = await Machine.deleteMany({
      _id: { $in: ids },
      companyId: session.user.companyId
    });

    return NextResponse.json({
      message: `${result.deletedCount} machines deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error bulk deleting machines:', error);
    return NextResponse.json(
      { error: 'Failed to delete machines' },
      { status: 500 }
    );
  }
}
