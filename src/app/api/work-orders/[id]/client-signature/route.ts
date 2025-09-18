import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import { WorkOrder } from '@/models';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// Schema for client signature validation
const clientSignatureSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  clientId: z.string().min(1, 'Client ID is required'),
  signature: z.string().min(1, 'Signature is required'),
  signedAt: z.string(),
});

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
    
    // Debug: Log the received data
    console.log("Received client signature data:", body);
    
    const validatedData = clientSignatureSchema.parse(body);
    
    // Debug: Log validated data
    console.log("Validated client signature data:", validatedData);
    
    const { id } = await params;
    
    // Find the work order
    const workOrder = await WorkOrder.findOne({ 
      _id: id,
      companyId: session.user.companyId
    });
    
    if (!workOrder) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      );
    }
    
    // Check if work order is completed
    if (workOrder.status !== 'completed') {
      return NextResponse.json(
        { error: 'Can only add client signature to completed work orders' },
        { status: 400 }
      );
    }
    
    // Prepare the client signature data
    const clientSignatureData = {
      clientName: validatedData.clientName,
      clientId: validatedData.clientId,
      signature: validatedData.signature,
      signedAt: new Date(validatedData.signedAt),
    };
    
    // Update only the client signature
    const updatedWorkOrder = await WorkOrder.findOneAndUpdate(
      { _id: id, companyId: session.user.companyId },
      { 
        clientSignature: clientSignatureData,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    )
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
    
    if (!updatedWorkOrder) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      );
    }
    
    // Debug: Log the updated work order
    console.log("Updated work order with client signature:", updatedWorkOrder.clientSignature);
    
    return NextResponse.json({
      message: 'Client signature added successfully',
      workOrder: updatedWorkOrder
    });
    
  } catch (error) {
    console.error('Error adding client signature:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to add client signature' },
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
    
    // Find the work order
    const workOrder = await WorkOrder.findOne({ 
      _id: id,
      companyId: session.user.companyId
    });
    
    if (!workOrder) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      );
    }
    
    // Check if work order is completed
    if (workOrder.status !== 'completed') {
      return NextResponse.json(
        { error: 'Can only remove client signature from completed work orders' },
        { status: 400 }
      );
    }
    
    // Remove the client signature
    const updatedWorkOrder = await WorkOrder.findOneAndUpdate(
      { _id: id, companyId: session.user.companyId },
      { 
        $unset: { clientSignature: 1 },
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    )
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
    
    if (!updatedWorkOrder) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      message: 'Client signature removed successfully',
      workOrder: updatedWorkOrder
    });
    
  } catch (error) {
    console.error('Error removing client signature:', error);
    return NextResponse.json(
      { error: 'Failed to remove client signature' },
      { status: 500 }
    );
  }
}
