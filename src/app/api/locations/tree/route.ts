import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Location, Machine } from '@/models';
import mongoose from 'mongoose';

// GET /api/locations/tree - Get root locations only (optimized for lazy loading)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50'); // Limit root locations
    const offset = parseInt(searchParams.get('offset') || '0');
    const parentId = searchParams.get('parentId');

    // Get locations based on parentId parameter
    const query: any = { companyId: session.user.companyId };
    
    if (parentId) {
      query.parentId = new mongoose.Types.ObjectId(parentId);
    } else {
      query.parentId = null;
    }
    
    const locations = await Location.find(query)
      .sort({ name: 1 })
      .skip(offset)
      .limit(limit)
      .lean();
      
    // Get total count for pagination
    const totalLocations = await Location.countDocuments(query);

    // Get machines for locations (limit to avoid memory issues)
    const locationIds = locations.map(loc => loc._id);
    const machines = await Machine.find({ 
      locationId: { $in: locationIds },
      companyId: session.user.companyId 
    })
      .populate('model')
      .limit(100) // Limit machines per location to avoid memory issues
      .lean();

    // Get children count for each location - Batch query for better performance
    const childrenCounts = await Location.aggregate([
      {
        $match: {
          parentId: { $in: locationIds },
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

    // Build locations with their machines and children info
    const tree = locations.map(location => {
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

    return NextResponse.json({
      locations: tree,
      totalItems: totalLocations,
      hasMore: offset + limit < totalLocations,
      offset,
      limit
    });
  } catch (error) {
    console.error('Error fetching location tree:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

