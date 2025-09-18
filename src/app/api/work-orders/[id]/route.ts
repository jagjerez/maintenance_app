import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import { WorkOrder } from '@/models';
import { workOrderUpdateSchema } from '@/lib/validations';
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
    const workOrder = await WorkOrder.findOne({ 
      _id: id,
      companyId: session.user.companyId
    })
      .populate({
        path: 'machines.machine',
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
    console.log("Received work order update data:", body);
    console.log("Operator signature in request:", body.operatorSignature);
    console.log("Client signature in request:", body.clientSignature);
    
    const validatedData = workOrderUpdateSchema.parse(body);
    
    // Debug: Log validated data
    console.log("Validated data:", validatedData);
    console.log("Validated operator signature:", validatedData.operatorSignature);
    console.log("Validated client signature:", validatedData.clientSignature);
    
    const { id } = await params;
    
    // First, get the current work order to check business rules
    const currentWorkOrder = await WorkOrder.findOne({ 
      _id: id
    });
    
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
    
    // Check if trying to change the list of machines when there's maintenance data
    if (validatedData.machines && validatedData.machines.length > 0) {
      const hasMaintenanceData = 
        (currentWorkOrder.filledOperations && currentWorkOrder.filledOperations.length > 0) ||
        (currentWorkOrder.labor && currentWorkOrder.labor.length > 0) ||
        (currentWorkOrder.materials && currentWorkOrder.materials.length > 0) ||
        (currentWorkOrder.images && currentWorkOrder.images.length > 0);
      
      if (hasMaintenanceData) {
        // Check if the machine IDs are being changed (not just maintenance data)
        const currentMachineIds = currentWorkOrder.machines.map((m: { machineId: string }) => m.machineId.toString()).sort();
        const newMachineIds = validatedData.machines.map((m: { machineId: string }) => m.machineId.toString()).sort();
        
        // Only block if the machine IDs are different (meaning machines are being added/removed)
        const machineIdsChanged = JSON.stringify(currentMachineIds) !== JSON.stringify(newMachineIds);
        
        if (machineIdsChanged) {
          return NextResponse.json(
            { error: 'Cannot change machines when maintenance has been performed' },
            { status: 400 }
          );
        }
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
          startTime: new Date(l.startTime), // Already UTC from frontend
          endTime: l.endTime ? new Date(l.endTime) : undefined, // Already UTC from frontend
        }))
      }),
      ...(validatedData.materials && { materials: validatedData.materials }),
      ...(validatedData.images && {
        images: validatedData.images.map(img => ({
          ...img,
          uploadedAt: new Date(img.uploadedAt),
        }))
      }),
      // Handle operator signature
      ...(validatedData.operatorSignature ? {
        operatorSignature: {
          ...validatedData.operatorSignature,
          signedAt: new Date(validatedData.operatorSignature.signedAt),
        }
      } : validatedData.operatorSignature === null ? { operatorSignature: null } : {}),
      
      // Handle client signature
      ...(validatedData.clientSignature ? {
        clientSignature: {
          ...validatedData.clientSignature,
          signedAt: new Date(validatedData.clientSignature.signedAt),
        }
      } : validatedData.clientSignature === null ? { clientSignature: null } : {}),
    };

    // Handle machine-specific maintenance data updates
    if (validatedData.machines && validatedData.machines.length > 0) {
      // If machines are being updated, we need to update them individually
      // to preserve existing data and only update maintenance-specific fields
      const machineUpdates = validatedData.machines.map((machineUpdate: { machineId: string; filledOperations?: unknown[]; images?: unknown[] }) => {
        const machineId = machineUpdate.machineId;
        const updateFields: Record<string, unknown> = {};
        
        // Only update fields that are present in the update
        if (machineUpdate.filledOperations) {
          updateFields.filledOperations = machineUpdate.filledOperations.map((op: unknown) => {
            const opData = op as Record<string, unknown>;
            const filledAtValue = opData.filledAt;
            let filledAt: Date;
            
            if (filledAtValue instanceof Date) {
              filledAt = filledAtValue; // Already UTC
            } else if (typeof filledAtValue === 'string') {
              filledAt = new Date(filledAtValue); // ISO string is already UTC
            } else {
              filledAt = new Date(); // fallback to current UTC date
            }
            
            // Ensure the date is valid
            if (isNaN(filledAt.getTime())) {
              filledAt = new Date(); // fallback to current UTC date
            }
            
            return {
              ...opData,
              filledAt,
            };
          });
        }
        
        if (machineUpdate.images) {
          updateFields.images = machineUpdate.images.map((img: unknown) => {
            const imgData = img as Record<string, unknown>;
            const uploadedAtValue = imgData.uploadedAt;
            let uploadedAt: Date;
            
            if (uploadedAtValue instanceof Date) {
              uploadedAt = uploadedAtValue; // Already UTC
            } else if (typeof uploadedAtValue === 'string') {
              uploadedAt = new Date(uploadedAtValue); // ISO string is already UTC
            } else {
              uploadedAt = new Date(); // fallback to current UTC date
            }
            
            // Ensure the date is valid
            if (isNaN(uploadedAt.getTime())) {
              uploadedAt = new Date(); // fallback to current UTC date
            }
            
            return {
              ...imgData,
              uploadedAt,
            };
          });
        }
        
        return {
          updateOne: {
            filter: { _id: id, 'machines.machineId': machineId },
            update: { $set: Object.keys(updateFields).reduce((acc: Record<string, unknown>, key) => {
              acc[`machines.$.${key}`] = updateFields[key];
              return acc;
            }, {}) }
          }
        };
      });

      // Execute the bulk update for machines
      await WorkOrder.bulkWrite(machineUpdates);
      
      // Remove machines from the main update since we handled them separately
      delete updateData.machines;
    }
    
    // Debug: Log the update data being sent to MongoDB
    console.log("Update data being sent to MongoDB:", updateData);
    console.log("Operator signature in update data:", updateData.operatorSignature);
    console.log("Client signature in update data:", updateData.clientSignature);
    
    const workOrder = await WorkOrder.findOneAndUpdate(
      { _id: id, companyId: session.user.companyId },
      updateData,
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
    
    if (!workOrder) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      );
    }
    
    // Debug: Log the updated work order to verify signatures were saved
    console.log("Updated work order from database:", workOrder);
    console.log("Operator signature in updated work order:", workOrder.operatorSignature);
    console.log("Client signature in updated work order:", workOrder.clientSignature);
    
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    const { id } = await params;
    
    // First, get the work order to check if it can be deleted
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
    
    await WorkOrder.findOneAndDelete({ 
      _id: id,
      companyId: session.user.companyId
    });
    
    return NextResponse.json({ message: 'Work order deleted successfully' });
  } catch (error) {
    console.error('Error deleting work order:', error);
    return NextResponse.json(
      { error: 'Failed to delete work order' },
      { status: 500 }
    );
  }
}
