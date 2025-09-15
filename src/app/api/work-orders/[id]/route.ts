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
      .populate('location')
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
    
    const { id } = await params;
    
    // First, get the current work order to check business rules
    const currentWorkOrder = await WorkOrder.findById(id);
    
    if (!currentWorkOrder) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      );
    }
    
    // Check if work order is completed
    if (currentWorkOrder.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot edit completed work order' },
        { status: 400 }
      );
    }
    
    // Check if trying to change machines when there's maintenance data
    if (validatedData.machines && validatedData.machines.length > 0) {
      const hasMaintenanceData = 
        (currentWorkOrder.filledOperations && currentWorkOrder.filledOperations.length > 0) ||
        (currentWorkOrder.labor && currentWorkOrder.labor.length > 0) ||
        (currentWorkOrder.materials && currentWorkOrder.materials.length > 0) ||
        (currentWorkOrder.images && currentWorkOrder.images.length > 0);
      
      if (hasMaintenanceData) {
        return NextResponse.json(
          { error: 'Cannot change machines when maintenance has been performed' },
          { status: 400 }
        );
      }
    }
    
    // Convert date strings to Date objects if they exist
    const updateData = {
      ...validatedData,
      ...(validatedData.scheduledDate && { scheduledDate: new Date(validatedData.scheduledDate) }),
      ...(validatedData.completedDate && { completedDate: new Date(validatedData.completedDate) }),
      ...(validatedData.labor && {
        labor: validatedData.labor.map(l => ({
          ...l,
          startTime: new Date(l.startTime),
          endTime: l.endTime ? new Date(l.endTime) : undefined,
        }))
      }),
      ...(validatedData.materials && { materials: validatedData.materials }),
      ...(validatedData.images && {
        images: validatedData.images.map(img => ({
          ...img,
          uploadedAt: new Date(img.uploadedAt),
        }))
      }),
    };
    
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
      .populate('location')
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
    
    // First, get the work order to check if it can be deleted
    const workOrder = await WorkOrder.findById(id);
    
    if (!workOrder) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      );
    }
    
    // Check if work order can be deleted based on business rules
    if (workOrder.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot delete work order that is not in pending status' },
        { status: 400 }
      );
    }
    
    // Check if there's any maintenance data
    const hasMaintenanceData = 
      (workOrder.filledOperations && workOrder.filledOperations.length > 0) ||
      (workOrder.labor && workOrder.labor.length > 0) ||
      (workOrder.materials && workOrder.materials.length > 0) ||
      (workOrder.images && workOrder.images.length > 0);
    
    if (hasMaintenanceData) {
      return NextResponse.json(
        { error: 'Cannot delete work order with maintenance data' },
        { status: 400 }
      );
    }
    
    await WorkOrder.findByIdAndDelete(id);
    
    return NextResponse.json({ message: 'Work order deleted successfully' });
  } catch (error) {
    console.error('Error deleting work order:', error);
    return NextResponse.json(
      { error: 'Failed to delete work order' },
      { status: 500 }
    );
  }
}
