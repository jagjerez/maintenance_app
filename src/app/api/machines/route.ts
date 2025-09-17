import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import { Machine } from '@/models';
import { machineCreateSchema } from '@/lib/validations';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const totalItems = await Machine.countDocuments({ companyId: session.user.companyId });

    const machines = await Machine.find({ companyId: session.user.companyId })
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
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      machines,
      totalItems,
      totalPages,
      currentPage: page,
      itemsPerPage: limit
    });
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
    if (!session?.user) {
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
    
    // Validate no duplicate model in same location
    const existingMachine = await Machine.findOne({
      model: dataWithCompany.model,
      locationId: dataWithCompany.locationId,
      companyId: session.user.companyId,
    });
    
    if (existingMachine) {
      return NextResponse.json(
        { error: 'duplicateModelLocation' },
        { status: 400 }
      );
    }
    
    const machine = new Machine(dataWithCompany);
    await machine.save();
    
    const populatedMachine = await Machine.findById(machine._id)
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
