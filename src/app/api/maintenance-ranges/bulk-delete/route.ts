import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import { MaintenanceRange } from '@/models';
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

    // Verify all maintenance ranges belong to the user's company
    const maintenanceRanges = await MaintenanceRange.find({
      _id: { $in: ids },
      companyId: session.user.companyId
    });

    if (maintenanceRanges.length !== ids.length) {
      return NextResponse.json(
        { error: 'Some maintenance ranges not found or not authorized' },
        { status: 400 }
      );
    }

    // Check if any maintenance range is being used in work orders
    const { WorkOrder } = await import('@/models');
    const workOrders = await WorkOrder.find({
      'machines.maintenanceRangeIds': { $in: ids },
      companyId: session.user.companyId
    });

    if (workOrders.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete maintenance ranges that are being used in work orders',
          workOrdersCount: workOrders.length
        },
        { status: 400 }
      );
    }

    // Delete all maintenance ranges
    const result = await MaintenanceRange.deleteMany({
      _id: { $in: ids },
      companyId: session.user.companyId
    });

    return NextResponse.json({
      message: `${result.deletedCount} maintenance ranges deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error bulk deleting maintenance ranges:', error);
    return NextResponse.json(
      { error: 'Failed to delete maintenance ranges' },
      { status: 500 }
    );
  }
}
