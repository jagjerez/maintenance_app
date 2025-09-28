import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import { Machine } from '@/models';
import { machineUpdateSchema } from '@/lib/validations';
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
    const machine = await Machine.findOne({ 
      _id: id,
      companyId: session.user.companyId
    })
      .populate({
        path: 'model',
        match: { companyId: session.user.companyId }
      })
      .populate({
        path: 'operations',
        match: { companyId: session.user.companyId }
      });
    
    if (!machine) {
      return NextResponse.json(
        { error: 'Machine not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(machine);
  } catch (error) {
    console.error('Error fetching machine:', error);
    return NextResponse.json(
      { error: 'Failed to fetch machine' },
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
    const validatedData = machineUpdateSchema.parse(body);
    
    // Clean empty string values for ObjectId fields
    if (validatedData.locationId === '') {
      validatedData.locationId = undefined;
    }
    
    const { id } = await params;
    
    // Get current machine to check if we need to validate
    const currentMachine = await Machine.findOne({ 
      _id: id,
      companyId: session.user.companyId
    });
    if (!currentMachine) {
      return NextResponse.json(
        { error: 'Machine not found' },
        { status: 404 }
      );
    }
    
    // Validate no duplicate model in same location (only if model or locationId are being updated)
    if (validatedData.model || validatedData.locationId !== undefined) {
      const modelToCheck = validatedData.model || currentMachine.model;
      const locationIdToCheck = validatedData.locationId !== undefined ? validatedData.locationId : currentMachine.locationId;
      
      const existingMachine = await Machine.findOne({
        _id: { $ne: id },
        model: modelToCheck,
        locationId: locationIdToCheck,
        companyId: session.user.companyId,
      });
      
      if (existingMachine) {
        return NextResponse.json(
          { error: 'duplicateModelLocation' },
          { status: 400 }
        );
      }
    }
    
    
    
    const updateData = { ...validatedData };
    
    const machine = await Machine.findOneAndUpdate(
      { _id: id, companyId: session.user.companyId },
      updateData,
      { new: true, runValidators: true }
    )
      .populate({
        path: 'model',
        match: { companyId: session.user.companyId }
      })
      .populate({
        path: 'operations',
        match: { companyId: session.user.companyId }
      });
    
    if (!machine) {
      return NextResponse.json(
        { error: 'Machine not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(machine);
  } catch (error) {
    console.error('Error updating machine:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update machine' },
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
    const machine = await Machine.findOneAndDelete({ 
      _id: id,
      companyId: session.user.companyId
    });
    
    if (!machine) {
      return NextResponse.json(
        { error: 'Machine not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Machine deleted successfully' });
  } catch (error) {
    console.error('Error deleting machine:', error);
    return NextResponse.json(
      { error: 'Failed to delete machine' },
      { status: 500 }
    );
  }
}
