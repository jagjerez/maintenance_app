import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MachineModel from '@/models/MachineModel';
import { machineModelUpdateSchema } from '@/lib/validations';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const machineModel = await MachineModel.findById(id);
    
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
    await connectDB();
    const body = await request.json();
    const validatedData = machineModelUpdateSchema.parse(body);
    
    const { id } = await params;
    const machineModel = await MachineModel.findByIdAndUpdate(
      id,
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
    await connectDB();
    const { id } = await params;
    const machineModel = await MachineModel.findByIdAndDelete(id);
    
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
