import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MaintenanceRange from '@/models/MaintenanceRange';
import { maintenanceRangeUpdateSchema } from '@/lib/validations';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const maintenanceRange = await MaintenanceRange.findById(id)
      .populate('operations');
    
    if (!maintenanceRange) {
      return NextResponse.json(
        { error: 'Maintenance range not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(maintenanceRange);
  } catch (error) {
    console.error('Error fetching maintenance range:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance range' },
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
    const validatedData = maintenanceRangeUpdateSchema.parse(body);
    
    const { id } = await params;
    const maintenanceRange = await MaintenanceRange.findByIdAndUpdate(
      id,
      validatedData,
      { new: true, runValidators: true }
    ).populate('operations');
    
    if (!maintenanceRange) {
      return NextResponse.json(
        { error: 'Maintenance range not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(maintenanceRange);
  } catch (error) {
    console.error('Error updating maintenance range:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update maintenance range' },
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
    const maintenanceRange = await MaintenanceRange.findByIdAndDelete(id);
    
    if (!maintenanceRange) {
      return NextResponse.json(
        { error: 'Maintenance range not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Maintenance range deleted successfully' });
  } catch (error) {
    console.error('Error deleting maintenance range:', error);
    return NextResponse.json(
      { error: 'Failed to delete maintenance range' },
      { status: 500 }
    );
  }
}
