import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Machine } from '@/models';
import { machineUpdateSchema } from '@/lib/validations';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const machine = await Machine.findById(id)
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
    await connectDB();
    const body = await request.json();
    const validatedData = machineUpdateSchema.parse(body);
    
    // Clean empty string values for ObjectId fields
    if (validatedData.locationId === '') {
      validatedData.locationId = undefined;
    }
    
    const { id } = await params;
    
    // Get current machine to check if we need to validate
    const currentMachine = await Machine.findById(id);
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
    
    // Validate no duplicate maintenance range types (only if maintenanceRanges are being updated)
    if (validatedData.maintenanceRanges) {
      const { MaintenanceRange } = await import('@/models');
      const maintenanceRanges = await MaintenanceRange.find({
        _id: { $in: validatedData.maintenanceRanges },
        companyId: currentMachine.companyId,
      });
      
      const types = maintenanceRanges.map(range => range.type);
      const uniqueTypes = [...new Set(types)];
      
      if (types.length !== uniqueTypes.length) {
        return NextResponse.json(
          { error: 'duplicateMaintenanceRangeType' },
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
    
    const machine = await Machine.findByIdAndUpdate(
      id,
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
    await connectDB();
    const { id } = await params;
    const machine = await Machine.findByIdAndDelete(id);
    
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
