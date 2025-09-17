import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import { MaintenanceRange } from '@/models';
import { maintenanceRangeCreateSchema } from '@/lib/validations';
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

    const totalItems = await MaintenanceRange.countDocuments({ companyId: session.user.companyId });

    const maintenanceRanges = await MaintenanceRange.find({ companyId: session.user.companyId })
      .populate('operations')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      maintenanceRanges,
      totalItems,
      totalPages,
      currentPage: page,
      itemsPerPage: limit
    });
  } catch (error) {
    console.error('Error fetching maintenance ranges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance ranges' },
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
    const validatedData = maintenanceRangeCreateSchema.parse(body);
    const dataWithCompany = {
      ...validatedData,
      companyId: session.user.companyId,
    };
    
    const maintenanceRange = new MaintenanceRange(dataWithCompany);
    await maintenanceRange.save();
    
    const populatedRange = await MaintenanceRange.findById(maintenanceRange._id)
      .populate('operations');
    return NextResponse.json(populatedRange, { status: 201 });
  } catch (error) {
    console.error('Error creating maintenance range:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create maintenance range' },
      { status: 500 }
    );
  }
}
