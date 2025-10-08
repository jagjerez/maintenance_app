import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Location, Machine } from '@/models';

// GET /api/locations/[id]/machines - Get machines for a specific location
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Verify the location exists and belongs to the user's company
    const location = await Location.findOne({
      _id: id,
      companyId: session.user.companyId
    });

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // Get machines for this location with pagination
    const machines = await Machine.find({
      locationId: id,
      companyId: session.user.companyId
    })
      .sort({ description: 1 })
      .skip(offset)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalMachines = await Machine.countDocuments({
      locationId: id,
      companyId: session.user.companyId
    });

    return NextResponse.json({
      machines,
      totalItems: totalMachines,
      hasMore: offset + limit < totalMachines,
      offset,
      limit
    });
  } catch (error) {
    console.error('Error fetching location machines:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
