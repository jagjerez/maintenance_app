import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Operation from '@/models/Operation';
import { operationSchema } from '@/lib/validations';

export async function GET() {
  try {
    await connectDB();
    const operations = await Operation.find().sort({ createdAt: -1 });
    return NextResponse.json(operations);
  } catch (error) {
    console.error('Error fetching operations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch operations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const validatedData = operationSchema.parse(body);
    
    const operation = new Operation(validatedData);
    await operation.save();
    
    return NextResponse.json(operation, { status: 201 });
  } catch (error) {
    console.error('Error creating operation:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create operation' },
      { status: 500 }
    );
  }
}
