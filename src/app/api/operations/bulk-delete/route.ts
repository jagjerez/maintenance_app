import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import { Operation } from '@/models';
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

    // Verify all operations belong to the user's company
    const operations = await Operation.find({
      _id: { $in: ids },
      companyId: session.user.companyId
    });

    if (operations.length !== ids.length) {
      return NextResponse.json(
        { error: 'Some operations not found or not authorized' },
        { status: 400 }
      );
    }

    // Check if any operation is being used in maintenance ranges
    const { MaintenanceRange } = await import('@/models');
    const maintenanceRanges = await MaintenanceRange.find({
      operations: { $in: ids },
      companyId: session.user.companyId
    });

    if (maintenanceRanges.length > 0) {
      const rangeNames = maintenanceRanges.map(range => range.name).join(', ');
      return NextResponse.json(
        { 
          error: 'Cannot delete operations that are being used in maintenance ranges',
          details: { maintenanceRanges: rangeNames }
        },
        { status: 400 }
      );
    }

    // Delete all operations
    const result = await Operation.deleteMany({
      _id: { $in: ids },
      companyId: session.user.companyId
    });

    return NextResponse.json({
      message: `${result.deletedCount} operations deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error bulk deleting operations:', error);
    return NextResponse.json(
      { error: 'Failed to delete operations' },
      { status: 500 }
    );
  }
}
