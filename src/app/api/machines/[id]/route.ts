import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import { Machine } from '@/models';
import { machineUpdateSchema } from '@/lib/validations';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    const { id } = await params;
    const machine = await Machine.findOne({ 
      _id: id, 
      companyId: session.user.companyId 
    })
      .populate('model')
      .populate('maintenanceRanges')
      .populate('operations');
    
    if (!machine) {
      return NextResponse.json(
        { error: 'Machine not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(machine);
  } catch (error) {
    console.error('Error fetching machine:', error);
    return NextResponse.json(
      { error: 'Failed to fetch machine' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    const body = await request.json();
    const validatedData = machineUpdateSchema.parse(body);
    
    // Clean empty string values for ObjectId fields
    if (validatedData.locationId === '') {
      validatedData.locationId = undefined;
    }
    
    const { id } = await params;
    
    // Get current machine to check if we need to validate
    const currentMachine = await Machine.findOne({ 
      _id: id, 
      companyId: session.user.companyId 
    });
    if (!currentMachine) {
      return NextResponse.json(
        { error: 'Machine not found' },
        { status: 404 }
      );
    }
    
    // Validate no duplicate model with same maintenance ranges (only if model or maintenanceRanges are being updated)
    if (validatedData.model || validatedData.maintenanceRanges) {
      const modelToCheck = validatedData.model || currentMachine.model;
      const rangesToCheck = validatedData.maintenanceRanges || currentMachine.maintenanceRanges;
      
      const existingMachine = await Machine.findOne({
        _id: { $ne: id },
        model: modelToCheck,
        maintenanceRanges: { $all: rangesToCheck },
        companyId: currentMachine.companyId,
      });
      
      if (existingMachine) {
        return NextResponse.json(
          { error: 'A machine with this model and maintenance ranges already exists' },
          { status: 400 }
        );
      }
    }
    
    // Validate operations are not duplicated in maintenance ranges
    if (validatedData.operations && validatedData.operations.length > 0) {
      const { Operation } = await import('@/models');
      const operations = await Operation.find({
        _id: { $in: validatedData.operations },
        companyId: currentMachine.companyId,
      });
      
      const { MaintenanceRange } = await import('@/models');
      const maintenanceRanges = await MaintenanceRange.find({
        _id: { $in: validatedData.maintenanceRanges || currentMachine.maintenanceRanges },
        companyId: currentMachine.companyId,
      }).populate('operations');
      
      // Check for duplicate operations
      for (const operation of operations) {
        for (const range of maintenanceRanges) {
          if (range.operations && range.operations.some((op: { _id: { toString: () => string } }) => op._id.toString() === operation._id.toString())) {
            return NextResponse.json(
              { error: `Operation "${operation.name}" is already associated with maintenance range "${range.name}"` },
              { status: 400 }
            );
          }
        }
      }
    }
    
    const machine = await Machine.findOneAndUpdate(
      { _id: id, companyId: session.user.companyId },
      validatedData,
      { new: true, runValidators: true }
    )
      .populate('model')
      .populate('maintenanceRanges')
      .populate('operations');
    
    if (!machine) {
      return NextResponse.json(
        { error: 'Machine not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(machine);
  } catch (error) {
    console.error('Error updating machine:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update machine' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    const { id } = await params;
    const machine = await Machine.findOneAndDelete({ 
      _id: id, 
      companyId: session.user.companyId 
    });
    
    if (!machine) {
      return NextResponse.json(
        { error: 'Machine not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Machine deleted successfully' });
  } catch (error) {
    console.error('Error deleting machine:', error);
    return NextResponse.json(
      { error: 'Failed to delete machine' },
      { status: 500 }
    );
  }
}
