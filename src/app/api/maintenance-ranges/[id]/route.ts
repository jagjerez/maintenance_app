import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import { MaintenanceRange } from '@/models';
import { maintenanceRangeUpdateSchema } from '@/lib/validations';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    const { id } = await params;
    const maintenanceRange = await MaintenanceRange.findOne({ 
      _id: id, 
      companyId: session.user.companyId 
    }).populate('operations');
    
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    const body = await request.json();
    const validatedData = maintenanceRangeUpdateSchema.parse(body);
    
    const { id } = await params;
    const maintenanceRange = await MaintenanceRange.findOneAndUpdate(
      { _id: id, companyId: session.user.companyId },
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    const { id } = await params;
    const maintenanceRange = await MaintenanceRange.findOneAndDelete({ 
      _id: id, 
      companyId: session.user.companyId 
    });
    
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
