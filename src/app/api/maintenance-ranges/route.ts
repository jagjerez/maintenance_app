import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MaintenanceRange from '@/models/MaintenanceRange';
import { maintenanceRangeSchema } from '@/lib/validations';

export async function GET() {
  try {
    await connectDB();
    const maintenanceRanges = await MaintenanceRange.find()
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
    await connectDB();
    const body = await request.json();
    const validatedData = maintenanceRangeSchema.parse(body);
    
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
