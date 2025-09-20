import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import { WorkOrder } from '@/models';
import { workOrderCreateSchema } from '@/lib/validations';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    const query: Record<string, unknown> = { companyId: session.user.companyId };
    
    if (status) query.status = status;
    if (type) query.type = type;
    
    const workOrders = await WorkOrder.find(query)
      .populate({
        path: 'machines.machineId',
        model: 'Machine',
        populate: {
          path: 'model',
          model: 'MachineModel'
        }
      })
      .populate({
        path: 'machines.maintenanceRangeIds',
        model: 'MaintenanceRange',
        populate: {
          path: 'operations',
          model: 'Operation'
        }
      })
      .populate({
        path: 'machines.operations',
        model: 'Operation'
      })
      .populate('workOrderLocation')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const totalItems = await WorkOrder.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);
    
    // Debug: Log the first work order to see if signatures are included
    if (workOrders.length > 0) {
      console.log("First work order from GET API:", JSON.stringify(workOrders[0], null, 2));
      console.log("Operator signature:", workOrders[0].operatorSignature);
      console.log("Client signature:", workOrders[0].clientSignature);
    }
    
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    const body = await request.json();
    
    const validatedData = workOrderCreateSchema.parse(body);
    const dataWithCompany = {
      ...validatedData,
      companyId: session.user.companyId,
    };
    
    // Validate maintenance ranges match work order type
    if (dataWithCompany.type && dataWithCompany.machines && dataWithCompany.machines.length > 0) {
      const { MaintenanceRange } = await import('@/models');
      
      for (const machine of dataWithCompany.machines) {
        if (machine.maintenanceRangeIds && machine.maintenanceRangeIds.length > 0) {
          const maintenanceRanges = await MaintenanceRange.find({
            _id: { $in: machine.maintenanceRangeIds },
            companyId: session.user.companyId,
          });
          
          // Check that all maintenance ranges match the work order type
          const invalidRanges = maintenanceRanges.filter(range => range.type !== dataWithCompany.type);
          if (invalidRanges.length > 0) {
            return NextResponse.json(
              { error: `Maintenance range "${invalidRanges[0].name}" type does not match work order type` },
              { status: 400 }
            );
          }
        }
      }
    }
    
    // Convert date strings to Date objects
    const workOrderData = {
      ...dataWithCompany,
      scheduledDate: new Date(dataWithCompany.scheduledDate),
      completedDate: dataWithCompany.completedDate ? new Date(dataWithCompany.completedDate) : undefined,
      labor: dataWithCompany.labor?.map(l => ({
        ...l,
        startTime: new Date(l.startTime),
        endTime: l.endTime ? new Date(l.endTime) : undefined,
      })) || [],
      materials: dataWithCompany.materials || [],
      images: dataWithCompany.images?.map(img => ({
        ...img,
        uploadedAt: new Date(img.uploadedAt),
      })) || [],
      operatorSignature: dataWithCompany.operatorSignature ? {
        ...dataWithCompany.operatorSignature,
        signedAt: new Date(dataWithCompany.operatorSignature.signedAt),
      } : undefined,
      clientSignature: dataWithCompany.clientSignature ? {
        ...dataWithCompany.clientSignature,
        signedAt: new Date(dataWithCompany.clientSignature.signedAt),
      } : undefined,
    };
    
    const workOrder = new WorkOrder(workOrderData);
    await workOrder.save();
    
    const populatedWorkOrder = await WorkOrder.findById(workOrder._id)
      .populate({
        path: 'machines.machineId',
        model: 'Machine',
        populate: {
          path: 'model',
          model: 'MachineModel'
        }
      })
      .populate({
        path: 'machines.maintenanceRangeIds',
        model: 'MaintenanceRange',
        populate: {
          path: 'operations',
          model: 'Operation'
        }
      })
      .populate({
        path: 'machines.operations',
        model: 'Operation'
      })
      .populate('workOrderLocation');
    
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
