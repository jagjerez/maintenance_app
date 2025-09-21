import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Location, Machine } from '@/models';

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

    // Verify the parent location exists and belongs to the user's company
    const parentLocation = await Location.findOne({
      _id: id,
      companyId: session.user.companyId
    });

    if (!parentLocation) {
      return NextResponse.json({ error: 'Parent location not found' }, { status: 404 });
    }

    // Get direct children locations
    const childrenLocations = await Location.find({
      parentId: id,
      companyId: session.user.companyId
    })
      .sort({ name: 1 })
      .lean();

    // Get machines for this location
    const machines = await Machine.find({ 
      locationId: id,
      companyId: session.user.companyId 
    })
      .populate('model')
      .populate('maintenanceRanges')
      .lean();

    // Get children count for each child location - Simplified approach
    const childrenCountMap = new Map();
    const childLocationIds = childrenLocations.map(loc => loc._id);
    
    // For each child location, count its children directly
    for (const childLocationId of childLocationIds) {
      const childrenCount = await Location.countDocuments({
        parentId: childLocationId,
        companyId: session.user.companyId
      });
      childrenCountMap.set(childLocationId.toString(), childrenCount);
    }

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

    return NextResponse.json(childrenWithData);
  } catch (error) {
    console.error('Error fetching location children:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
