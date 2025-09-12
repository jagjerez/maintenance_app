import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import WorkOrder from '@/models/WorkOrder';
import { workOrderSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const machine = searchParams.get('machine');
    const type = searchParams.get('type');
    
    const query: Record<string, string> = {};
    
    if (status) query.status = status;
    if (machine) query.machine = machine;
    if (type) {
      // This would require a more complex query with population
      // For now, we'll handle this in the frontend
    }
    
    const workOrders = await WorkOrder.find(query)
      .populate('machine')
      .populate({
        path: 'machine',
        populate: {
          path: 'model',
          model: 'MachineModel'
        }
      })
      .populate('maintenanceRange')
      .sort({ createdAt: -1 });
    
    return NextResponse.json(workOrders);
  } catch (error) {
    console.error('Error fetching work orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch work orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const validatedData = workOrderSchema.parse(body);
    
    // Convert date strings to Date objects
    const workOrderData = {
      ...validatedData,
      scheduledDate: new Date(validatedData.scheduledDate),
      completedDate: validatedData.completedDate ? new Date(validatedData.completedDate) : undefined,
    };
    
    const workOrder = new WorkOrder(workOrderData);
    await workOrder.save();
    
    const populatedWorkOrder = await WorkOrder.findById(workOrder._id)
      .populate('machine')
      .populate({
        path: 'machine',
        populate: {
          path: 'model',
          model: 'MachineModel'
        }
      })
      .populate('maintenanceRange');
    
    return NextResponse.json(populatedWorkOrder, { status: 201 });
  } catch (error) {
    console.error('Error creating work order:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create work order' },
      { status: 500 }
    );
  }
}
