import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import { MachineModel } from '@/models';
import { machineModelCreateSchema } from '@/lib/validations';
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
    let query: any = { companyId: session.user.companyId };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { manufacturer: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }

    const totalItems = await MachineModel.countDocuments(query);

    const machineModels = await MachineModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      machineModels,
      totalItems,
      totalPages,
      currentPage: page,
      itemsPerPage: limit
    });
  } catch (error) {
    console.error('Error fetching machine models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch machine models' },
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
    const validatedData = machineModelCreateSchema.parse(body);
    const dataWithCompany = {
      ...validatedData,
      companyId: session.user.companyId,
      internalCode: crypto.randomUUID()
    };
    
    const machineModel = new MachineModel(dataWithCompany);
    await machineModel.save();
    
    return NextResponse.json(machineModel, { status: 201 });
  } catch (error) {
    console.error('Error creating machine model:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create machine model' },
      { status: 500 }
    );
  }
}
