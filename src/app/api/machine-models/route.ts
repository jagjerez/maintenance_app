import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import { MachineModel } from '@/models';
import { machineModelCreateSchema } from '@/lib/validations';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    const machineModels = await MachineModel.find({ 
      companyId: session.user.companyId 
    }).sort({ createdAt: -1 });
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    const body = await request.json();
    const validatedData = machineModelCreateSchema.parse(body);
    const dataWithCompany = {
      ...validatedData,
      companyId: session.user.companyId,
    };
    
    const machineModel = new MachineModel(dataWithCompany);
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
