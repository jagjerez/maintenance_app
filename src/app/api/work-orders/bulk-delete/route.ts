import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import { WorkOrder } from '@/models';
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

    // Verify all work orders belong to the user's company
    const workOrders = await WorkOrder.find({
      _id: { $in: ids },
      companyId: session.user.companyId
    });

    if (workOrders.length !== ids.length) {
      return NextResponse.json(
        { error: 'Some work orders not found or not authorized' },
        { status: 400 }
      );
    }

    // Delete all work orders
    const result = await WorkOrder.deleteMany({
      _id: { $in: ids },
      companyId: session.user.companyId
    });

    return NextResponse.json({
      message: `${result.deletedCount} work orders deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error bulk deleting work orders:', error);
    return NextResponse.json(
      { error: 'Failed to delete work orders' },
      { status: 500 }
    );
  }
}
