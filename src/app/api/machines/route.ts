import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Machine } from '@/models';
import { machineSchema } from '@/lib/validations';

export async function GET() {
  try {
    await connectDB();
    const machines = await Machine.find()
      .populate('model')
      .populate('maintenanceRanges')
      .populate('operations')
      .sort({ createdAt: -1 });
    return NextResponse.json(machines);
  } catch (error) {
    console.error('Error fetching machines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch machines' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const validatedData = machineSchema.parse(body);
    
    // Clean empty string values for ObjectId fields
    if (validatedData.locationId === '') {
      validatedData.locationId = undefined;
    }
    
    // Validate no duplicate model with same maintenance ranges
    const existingMachine = await Machine.findOne({
      model: validatedData.model,
      maintenanceRanges: { $all: validatedData.maintenanceRanges },
      companyId: validatedData.companyId,
    });
    
    if (existingMachine) {
      return NextResponse.json(
        { error: 'A machine with this model and maintenance ranges already exists' },
        { status: 400 }
      );
    }
    
    // Validate no duplicate maintenance range types
    const { MaintenanceRange } = await import('@/models');
    const maintenanceRanges = await MaintenanceRange.find({
      _id: { $in: validatedData.maintenanceRanges },
      companyId: validatedData.companyId,
    });
    
    const types = maintenanceRanges.map(range => range.type);
    const uniqueTypes = [...new Set(types)];
    
    if (types.length !== uniqueTypes.length) {
      return NextResponse.json(
        { error: 'duplicateMaintenanceRangeType' },
        { status: 400 }
      );
    }
    
    // Validate operations are not duplicated in maintenance ranges
    if (validatedData.operations && validatedData.operations.length > 0) {
      const { Operation } = await import('@/models');
      const operations = await Operation.find({
        _id: { $in: validatedData.operations },
        companyId: validatedData.companyId,
      });
      
      const { MaintenanceRange } = await import('@/models');
      const maintenanceRanges = await MaintenanceRange.find({
        _id: { $in: validatedData.maintenanceRanges },
        companyId: validatedData.companyId,
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
    
    const machine = new Machine(validatedData);
    await machine.save();
    
    const populatedMachine = await Machine.findById(machine._id)
      .populate('model')
      .populate('maintenanceRanges')
      .populate('operations');
    return NextResponse.json(populatedMachine, { status: 201 });
  } catch (error) {
    console.error('Error creating machine:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create machine' },
      { status: 500 }
    );
  }
}
