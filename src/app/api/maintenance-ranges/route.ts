import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import { MaintenanceRange } from '@/models';
import { maintenanceRangeSchema } from '@/lib/validations';
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
    const maintenanceRanges = await MaintenanceRange.find({ 
      companyId: session.user.companyId 
    })
      .populate('operations')
      .sort({ createdAt: -1 });
    return NextResponse.json(maintenanceRanges);
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
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    const body = await request.json();
    const validatedData = maintenanceRangeSchema.parse({
      ...body,
      companyId: session.user.companyId,
    });
    
    const maintenanceRange = new MaintenanceRange(validatedData);
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
