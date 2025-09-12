import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Machine from '@/models/Machine';
import { machineSchema } from '@/lib/validations';

export async function GET() {
  try {
    await connectDB();
    const machines = await Machine.find().populate('model').sort({ createdAt: -1 });
    return NextResponse.json(machines);
  } catch (error) {
    console.error('Error fetching machines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch machines' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const validatedData = machineSchema.parse(body);
    
    const machine = new Machine(validatedData);
    await machine.save();
    
    const populatedMachine = await Machine.findById(machine._id).populate('model');
    return NextResponse.json(populatedMachine, { status: 201 });
  } catch (error) {
    console.error('Error creating machine:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create machine' },
      { status: 500 }
    );
  }
}
