import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Operation from '@/models/Operation';
import { operationUpdateSchema } from '@/lib/validations';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const operation = await Operation.findById(id);
    
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
    await connectDB();
    const body = await request.json();
    const validatedData = operationUpdateSchema.parse(body);
    
    const { id } = await params;
    const operation = await Operation.findByIdAndUpdate(
      id,
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
    await connectDB();
    const { id } = await params;
    const operation = await Operation.findByIdAndDelete(id);
    
    if (!operation) {
      return NextResponse.json(
        { error: 'Operation not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Operation deleted successfully' });
  } catch (error) {
    console.error('Error deleting operation:', error);
    return NextResponse.json(
      { error: 'Failed to delete operation' },
      { status: 500 }
    );
  }
}
