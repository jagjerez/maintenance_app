import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import { MachineModel } from '@/models';
import { machineModelUpdateSchema } from '@/lib/validations';
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
    const machineModel = await MachineModel.findOne({ 
      _id: id, 
      companyId: session.user.companyId 
    });
    
    if (!machineModel) {
      return NextResponse.json(
        { error: 'Machine model not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(machineModel);
  } catch (error) {
    console.error('Error fetching machine model:', error);
    return NextResponse.json(
      { error: 'Failed to fetch machine model' },
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
    const validatedData = machineModelUpdateSchema.parse(body);
    
    const { id } = await params;
    const machineModel = await MachineModel.findOneAndUpdate(
      { _id: id, companyId: session.user.companyId },
      validatedData,
      { new: true, runValidators: true }
    );
    
    if (!machineModel) {
      return NextResponse.json(
        { error: 'Machine model not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(machineModel);
  } catch (error) {
    console.error('Error updating machine model:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update machine model' },
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
    const machineModel = await MachineModel.findOneAndDelete({ 
      _id: id, 
      companyId: session.user.companyId 
    });
    
    if (!machineModel) {
      return NextResponse.json(
        { error: 'Machine model not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Machine model deleted successfully' });
  } catch (error) {
    console.error('Error deleting machine model:', error);
    return NextResponse.json(
      { error: 'Failed to delete machine model' },
      { status: 500 }
    );
  }
}
