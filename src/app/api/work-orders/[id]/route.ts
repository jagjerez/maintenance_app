import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { WorkOrder } from '@/models';
import { workOrderUpdateSchema } from '@/lib/validations';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const workOrder = await WorkOrder.findById(id)
      .populate({
        path: 'machines',
        populate: {
          path: 'model',
          model: 'MachineModel'
        }
      })
      .populate('operations')
      .populate({
        path: 'filledOperations.operationId',
        model: 'Operation'
      });
    
    if (!workOrder) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(workOrder);
  } catch (error) {
    console.error('Error fetching work order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch work order' },
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
    const validatedData = workOrderUpdateSchema.parse(body);
    
    // Convert date strings to Date objects if they exist
    const updateData = {
      ...validatedData,
      ...(validatedData.scheduledDate && { scheduledDate: new Date(validatedData.scheduledDate) }),
      ...(validatedData.completedDate && { completedDate: new Date(validatedData.completedDate) }),
    };
    
    const { id } = await params;
    const workOrder = await WorkOrder.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate({
        path: 'machines',
        populate: {
          path: 'model',
          model: 'MachineModel'
        }
      })
      .populate('operations')
      .populate({
        path: 'filledOperations.operationId',
        model: 'Operation'
      });
    
    if (!workOrder) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(workOrder);
  } catch (error) {
    console.error('Error updating work order:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update work order' },
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
    const workOrder = await WorkOrder.findByIdAndDelete(id);
    
    if (!workOrder) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Work order deleted successfully' });
  } catch (error) {
    console.error('Error deleting work order:', error);
    return NextResponse.json(
      { error: 'Failed to delete work order' },
      { status: 500 }
    );
  }
}
