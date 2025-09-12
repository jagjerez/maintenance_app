import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MachineModel from '@/models/MachineModel';
import { machineModelSchema } from '@/lib/validations';

export async function GET() {
  try {
    await connectDB();
    const machineModels = await MachineModel.find().sort({ createdAt: -1 });
    return NextResponse.json(machineModels);
  } catch (error) {
    console.error('Error fetching machine models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch machine models' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const validatedData = machineModelSchema.parse(body);
    
    const machineModel = new MachineModel(validatedData);
    await machineModel.save();
    
    return NextResponse.json(machineModel, { status: 201 });
  } catch (error) {
    console.error('Error creating machine model:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create machine model' },
      { status: 500 }
    );
  }
}
