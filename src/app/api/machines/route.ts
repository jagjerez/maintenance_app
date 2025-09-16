import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import { Machine } from '@/models';
import { machineCreateSchema } from '@/lib/validations';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    const machines = await Machine.find({ 
      companyId: session.user.companyId 
    })
      .populate('model')
      .populate({
        path: 'maintenanceRanges',
        populate: {
          path: 'operations',
          model: 'Operation'
        }
      })
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    const body = await request.json();
    const validatedData = machineCreateSchema.parse(body);
    const dataWithCompany = {
      ...validatedData,
      companyId: session.user.companyId,
    };
    
    // Clean empty string values for ObjectId fields
    if (dataWithCompany.locationId === '') {
      dataWithCompany.locationId = undefined;
    }
    
    // Validate no duplicate model with same maintenance ranges
    const existingMachine = await Machine.findOne({
      model: dataWithCompany.model,
      maintenanceRanges: { $all: dataWithCompany.maintenanceRanges },
      companyId: session.user.companyId,
    });
    
    if (existingMachine) {
      return NextResponse.json(
        { error: 'A machine with this model and maintenance ranges already exists' },
        { status: 400 }
      );
    }
    
    // Validate operations are not duplicated in maintenance ranges
    /* if (validatedData.operations && validatedData.operations.length > 0) {
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
    } */
    
    const machine = new Machine(dataWithCompany);
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
