import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Location, Machine } from '@/models';

// GET /api/locations/tree - Get root locations only (optimized for lazy loading)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get only root locations (no parentId)
    const rootLocations = await Location.find({ 
      parentId: null,
      companyId: session.user.companyId 
    })
      .sort({ name: 1 })
      .lean();
      
    // Get machines for root locations only
    const rootLocationIds = rootLocations.map(loc => loc._id);
    const machines = await Machine.find({ 
      locationId: { $in: rootLocationIds },
      companyId: session.user.companyId 
    })
      .populate('model')
      .populate('maintenanceRanges')
      .lean();

    // Get children count for each root location - Simplified approach
    const childrenCountMap = new Map();
    
    // For each root location, count its children directly
    for (const rootLocationId of rootLocationIds) {
      const childrenCount = await Location.countDocuments({
        parentId: rootLocationId,
        companyId: session.user.companyId
      });
      childrenCountMap.set(rootLocationId.toString(), childrenCount);
    }

    // Build root locations with their machines and children info
    const tree = rootLocations.map(location => {
      // Find machines in this location
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

    return NextResponse.json(tree);
  } catch (error) {
    console.error('Error fetching location tree:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

