import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import { MachineModel } from '@/models';
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

    // Verify all machine models belong to the user's company
    const machineModels = await MachineModel.find({
      _id: { $in: ids },
      companyId: session.user.companyId
    });

    if (machineModels.length !== ids.length) {
      return NextResponse.json(
        { error: 'Some machine models not found or not authorized' },
        { status: 400 }
      );
    }

    // Check if any machine model is being used in machines
    const { Machine } = await import('@/models');
    const machines = await Machine.find({
      model: { $in: ids },
      companyId: session.user.companyId
    });

    if (machines.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete machine models that are being used in machines' },
        { status: 400 }
      );
    }

    // Delete all machine models
    const result = await MachineModel.deleteMany({
      _id: { $in: ids },
      companyId: session.user.companyId
    });

    return NextResponse.json({
      message: `${result.deletedCount} machine models deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error bulk deleting machine models:', error);
    return NextResponse.json(
      { error: 'Failed to delete machine models' },
      { status: 500 }
    );
  }
}
