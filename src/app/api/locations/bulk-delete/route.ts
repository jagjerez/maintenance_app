import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import { Location } from '@/models';
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

    // Verify all locations belong to the user's company
    const locations = await Location.find({
      _id: { $in: ids },
      companyId: session.user.companyId
    });

    if (locations.length !== ids.length) {
      return NextResponse.json(
        { error: 'Some locations not found or not authorized' },
        { status: 400 }
      );
    }

    // Check if any location has children or machines
    const locationsWithChildren = await Location.find({
      parentId: { $in: ids },
      companyId: session.user.companyId
    });

    if (locationsWithChildren.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete locations that have children' },
        { status: 400 }
      );
    }

    // Check if any location has machines
    const { Machine } = await import('@/models');
    const locationsWithMachines = await Machine.find({
      locationId: { $in: ids },
      companyId: session.user.companyId
    });

    if (locationsWithMachines.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete locations that have machines' },
        { status: 400 }
      );
    }

    // Delete all locations
    const result = await Location.deleteMany({
      _id: { $in: ids },
      companyId: session.user.companyId
    });

    return NextResponse.json({
      message: `${result.deletedCount} locations deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error bulk deleting locations:', error);
    return NextResponse.json(
      { error: 'Failed to delete locations' },
      { status: 500 }
    );
  }
}
