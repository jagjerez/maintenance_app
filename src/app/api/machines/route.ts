import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import { Machine } from '@/models';
import { machineCreateSchema } from '@/lib/validations';
import { authOptions } from '@/lib/auth';
import crypto from 'crypto';

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
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    // Build search query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = { companyId: session.user.companyId };
    
    if (search) {
      query.$or = [
        { "model.name": { $regex: search, $options: "i" } },
        { "model.manufacturer": { $regex: search, $options: "i" } },
        { "model.brand": { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { "properties": { $regex: search, $options: "i" } }
      ];
    }

    const totalItems = await Machine.countDocuments(query);

    const machines = await Machine.find(query)
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
    
    // Validate maintenance ranges have only one type
    if (dataWithCompany.maintenanceRanges && dataWithCompany.maintenanceRanges.length > 0) {
      const { MaintenanceRange } = await import('@/models');
      const maintenanceRanges = await MaintenanceRange.find({
        _id: { $in: dataWithCompany.maintenanceRanges },
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
      if (uniqueTypes.length === 1 && uniqueTypes[0] === 'corrective' && dataWithCompany.operations && dataWithCompany.operations.length > 0) {
        return NextResponse.json(
          { error: 'correctiveMaintenanceNoOperations' },
          { status: 400 }
        );
      }
    }
    
    // Validate no duplicate model in same location
    const existingMachine = await Machine.findOne({
      model: dataWithCompany.model,
      locationId: dataWithCompany.locationId,
      companyId: session.user.companyId,
      internalCode: crypto.randomUUID()
    });
    
    if (existingMachine) {
      return NextResponse.json(
        { error: 'duplicateModelLocation' },
        { status: 400 }
      );
    }
    
    // For corrective maintenance ranges, ensure no operations are saved
    const machineData = { ...dataWithCompany };
    if (dataWithCompany.maintenanceRanges && dataWithCompany.maintenanceRanges.length > 0) {
      const { MaintenanceRange } = await import('@/models');
      const maintenanceRanges = await MaintenanceRange.find({
        _id: { $in: dataWithCompany.maintenanceRanges },
        companyId: session.user.companyId,
      });
      
      const types = maintenanceRanges.map(range => range.type);
      const uniqueTypes = [...new Set(types)];
      
      // If it's corrective, don't save operations
      if (uniqueTypes.length === 1 && uniqueTypes[0] === 'corrective') {
        machineData.operations = [];
      }
    }
    
    const machine = new Machine(machineData);
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
