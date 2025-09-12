import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Company } from '@/models';
import { companySchema } from '@/lib/validations';

export async function GET() {
  try {
    await connectDB();
    const companies = await Company.find().sort({ createdAt: -1 });
    return NextResponse.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const validatedData = companySchema.parse(body);
    
    const company = new Company(validatedData);
    await company.save();
    
    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error('Error creating company:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    );
  }
}
