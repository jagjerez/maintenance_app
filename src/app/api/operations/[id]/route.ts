import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import { Operation, MaintenanceRange } from '@/models';
import { operationUpdateSchema } from '@/lib/validations';
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
    const operation = await Operation.findOne({ 
      _id: id,
      companyId: session.user.companyId
    });
    if (!operation) {
      return NextResponse.json(
        { error: 'Operation not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(operation);
  } catch (error) {
    console.error('Error fetching operation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch operation' },
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
    const validatedData = operationUpdateSchema.parse(body);
    
    const { id } = await params;
    const operation = await Operation.findOneAndUpdate(
      { _id: id, companyId: session.user.companyId },
      validatedData,
      { new: true, runValidators: true }
    );
    
    if (!operation) {
      return NextResponse.json(
        { error: 'Operation not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(operation);
  } catch (error) {
    console.error('Error updating operation:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update operation' },
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
    
    // Verificar si la operación existe
    const operation = await Operation.findOne({ 
      _id: id,
      companyId: session.user.companyId
    });
    
    if (!operation) {
      return NextResponse.json(
        { error: 'Operation not found' },
        { status: 404 }
      );
    }

    // Verificar si la operación está siendo usada en algún maintenance range
    const maintenanceRangesUsingOperation = await MaintenanceRange.find({
      operations: id,
      companyId: session.user.companyId
    });

    if (maintenanceRangesUsingOperation.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete operation', 
          message: 'This operation is being used in one or more maintenance ranges and cannot be deleted',
          details: {
            maintenanceRanges: maintenanceRangesUsingOperation.map(range => ({
              id: range._id,
              name: range.name
            }))
          }
        },
        { status: 400 }
      );
    }

    // Si no está siendo usada, proceder con la eliminación
    await Operation.findByIdAndDelete(id);
    
    return NextResponse.json({ message: 'Operation deleted successfully' });
  } catch (error) {
    console.error('Error deleting operation:', error);
    return NextResponse.json(
      { error: 'Failed to delete operation' },
      { status: 500 }
    );
  }
}
