import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { WorkOrder } from '@/models';
import { workOrderSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    const query: Record<string, unknown> = {};
    
    if (status) query.status = status;
    if (type) query.type = type;
    
    const workOrders = await WorkOrder.find(query)
      .populate({
        path: 'machines',
        populate: {
          path: 'model',
          model: 'MachineModel'
        }
      })
      .populate({
        path: 'machines',
        populate: {
          path: 'maintenanceRanges',
          populate: {
            path: 'operations',
            model: 'Operation'
          }
        }
      })
      .populate('location')
      .populate('operations')
      .populate({
        path: 'filledOperations.operationId',
        model: 'Operation'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const totalItems = await WorkOrder.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);
    
    return NextResponse.json({
      workOrders,
      totalItems,
      totalPages,
      currentPage: page,
      itemsPerPage: limit
    });
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
      labor: validatedData.labor?.map(l => ({
        ...l,
        startTime: new Date(l.startTime),
        endTime: l.endTime ? new Date(l.endTime) : undefined,
      })) || [],
      materials: validatedData.materials || [],
      images: validatedData.images?.map(img => ({
        ...img,
        uploadedAt: new Date(img.uploadedAt),
      })) || [],
    };
    
    const workOrder = new WorkOrder(workOrderData);
    await workOrder.save();
    
    const populatedWorkOrder = await WorkOrder.findById(workOrder._id)
      .populate({
        path: 'machines',
        populate: {
          path: 'model',
          model: 'MachineModel'
        }
      })
      .populate({
        path: 'machines',
        populate: {
          path: 'maintenanceRanges',
          populate: {
            path: 'operations',
            model: 'Operation'
          }
        }
      })
      .populate('location')
      .populate('operations')
      .populate({
        path: 'filledOperations.operationId',
        model: 'Operation'
      });
    
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
