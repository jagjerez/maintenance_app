import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Location, Machine } from '@/models';
import mongoose from 'mongoose';

// GET /api/locations/[id]/children - Get children of a specific location
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
    const limit = parseInt(searchParams.get('limit') || '50'); // Limit children per load
    const offset = parseInt(searchParams.get('offset') || '0');

    // Verify the parent location exists and belongs to the user's company
    const parentLocation = await Location.findOne({
      _id: id,
      companyId: session.user.companyId
    });

    if (!parentLocation) {
      return NextResponse.json({ error: 'Parent location not found' }, { status: 404 });
    }

    // Get direct children locations with pagination
    const childrenLocations = await Location.find({
      parentId: id,
      companyId: session.user.companyId
    })
      .sort({ name: 1 })
      .skip(offset)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalChildren = await Location.countDocuments({
      parentId: id,
      companyId: session.user.companyId
    });

    // Get machines for this location (limit to avoid memory issues)
    const machines = await Machine.find({ 
      locationId: id,
      companyId: session.user.companyId 
    })
      .populate('model')
      .populate('maintenanceRanges')
      .limit(100) // Limit machines per location
      .lean();

    // Get children count for each child location - Batch query for better performance
    const childLocationIds = childrenLocations.map(loc => loc._id);
    const childrenCounts = await Location.aggregate([
      {
        $match: {
          parentId: { $in: childLocationIds },
          companyId: new mongoose.Types.ObjectId(session.user.companyId)
        }
      },
      {
        $group: {
          _id: '$parentId',
          count: { $sum: 1 }
        }
      }
    ]);

    const childrenCountMap = new Map();
    childrenCounts.forEach(item => {
      childrenCountMap.set(item._id.toString(), item.count);
    });

    // Build children with their own children and machines
    const childrenWithData = childrenLocations.map(location => {
      // Find machines in this child location
      const locationMachines = machines.filter(machine => 
        machine.locationId && machine.locationId.toString() === location._id.toString()
      );

      const childrenCount = childrenCountMap.get(location._id.toString()) || 0;

      return {
        ...location,
        machines: locationMachines,
        children: [], // Will be loaded on demand
        childrenCount: childrenCount, // Number of children available
        hasChildren: childrenCount > 0, // Boolean flag for easy checking
        isLeaf: childrenCount === 0, // True if no children
      };
    });

    return NextResponse.json({
      locations: childrenWithData,
      totalItems: totalChildren,
      hasMore: offset + limit < totalChildren,
      offset,
      limit
    });
  } catch (error) {
    console.error('Error fetching location children:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
