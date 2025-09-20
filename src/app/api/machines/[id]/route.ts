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
    if (!session?.user) {
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
      .populate({
        path: 'model',
        match: { companyId: session.user.companyId }
      })
      .populate({
        path: 'maintenanceRanges',
        match: { companyId: session.user.companyId },
        populate: {
          path: 'operations',
          model: 'Operation',
          match: { companyId: session.user.companyId }
        }
      })
      .populate({
        path: 'operations',
        match: { companyId: session.user.companyId }
      });
    
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
    if (!session?.user) {
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
    
    // Validate no duplicate model in same location (only if model or locationId are being updated)
    if (validatedData.model || validatedData.locationId !== undefined) {
      const modelToCheck = validatedData.model || currentMachine.model;
      const locationIdToCheck = validatedData.locationId !== undefined ? validatedData.locationId : currentMachine.locationId;
      
      const existingMachine = await Machine.findOne({
        _id: { $ne: id },
        model: modelToCheck,
        locationId: locationIdToCheck,
        companyId: session.user.companyId,
      });
      
      if (existingMachine) {
        return NextResponse.json(
          { error: 'duplicateModelLocation' },
          { status: 400 }
        );
      }
    }
    
    // Validate maintenance ranges have only one type
    if (validatedData.maintenanceRanges && validatedData.maintenanceRanges.length > 0) {
      const { MaintenanceRange } = await import('@/models');
      const maintenanceRanges = await MaintenanceRange.find({
        _id: { $in: validatedData.maintenanceRanges },
        companyId: session.user.companyId,
      });
      
      // Check that all maintenance ranges have the same type
      const types = maintenanceRanges.map(range => range.type);
      const uniqueTypes = [...new Set(types)];
      
      if (uniqueTypes.length > 1) {
        return NextResponse.json(
          { error: 'duplicateMaintenanceRangeType' },
          { status: 400 }
        );
      }
      
      // For corrective maintenance ranges, ensure no operations are provided
      if (uniqueTypes.length === 1 && uniqueTypes[0] === 'corrective' && validatedData.operations && validatedData.operations.length > 0) {
        return NextResponse.json(
          { error: 'correctiveMaintenanceNoOperations' },
          { status: 400 }
        );
      }
    }
    
    // Validate operations are not duplicated in maintenance ranges
    if (validatedData.operations && validatedData.operations.length > 0) {
      const { Operation } = await import('@/models');
      const operations = await Operation.find({
        _id: { $in: validatedData.operations },
        companyId: session.user.companyId,
      });
      
      const { MaintenanceRange } = await import('@/models');
      const maintenanceRanges = await MaintenanceRange.find({
        _id: { $in: validatedData.maintenanceRanges || currentMachine.maintenanceRanges },
        companyId: session.user.companyId,
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
    
    // For corrective maintenance ranges, ensure no operations are saved
    const updateData = { ...validatedData };
    if (validatedData.maintenanceRanges && validatedData.maintenanceRanges.length > 0) {
      const { MaintenanceRange } = await import('@/models');
      const maintenanceRanges = await MaintenanceRange.find({
        _id: { $in: validatedData.maintenanceRanges },
        companyId: session.user.companyId,
      });
      
      const types = maintenanceRanges.map(range => range.type);
      const uniqueTypes = [...new Set(types)];
      
      // If it's corrective, don't save operations
      if (uniqueTypes.length === 1 && uniqueTypes[0] === 'corrective') {
        updateData.operations = [];
      }
    }
    
    const machine = await Machine.findOneAndUpdate(
      { _id: id, companyId: session.user.companyId },
      updateData,
      { new: true, runValidators: true }
    )
      .populate({
        path: 'model',
        match: { companyId: session.user.companyId }
      })
      .populate({
        path: 'maintenanceRanges',
        match: { companyId: session.user.companyId },
        populate: {
          path: 'operations',
          model: 'Operation',
          match: { companyId: session.user.companyId }
        }
      })
      .populate({
        path: 'operations',
        match: { companyId: session.user.companyId }
      });
    
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
    if (!session?.user) {
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
