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

    // Get only root locations (no parentId) with pagination
    const rootLocations = await Location.find({ 
      parentId: null,
      companyId: session.user.companyId 
    })
      .sort({ name: 1 })
      .skip(offset)
      .limit(limit)
      .lean();
      
    // Get total count for pagination
    const totalRootLocations = await Location.countDocuments({
      parentId: null,
      companyId: session.user.companyId
    });

    // Get machines for root locations only (limit to avoid memory issues)
    const rootLocationIds = rootLocations.map(loc => loc._id);
    const machines = await Machine.find({ 
      locationId: { $in: rootLocationIds },
      companyId: session.user.companyId 
    })
      .populate('model')
      .populate('maintenanceRanges')
      .limit(100) // Limit machines per location to avoid memory issues
      .lean();

    // Get children count for each root location - Batch query for better performance
    console.log('Debug - session.user.companyId:', session.user.companyId);
    console.log('Debug - rootLocationIds:', rootLocationIds);
    
    const childrenCounts = await Location.aggregate([
      {
        $match: {
          parentId: { $in: rootLocationIds },
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
    
    console.log('Debug - childrenCounts result:', childrenCounts);

    const childrenCountMap = new Map();
    childrenCounts.forEach(item => {
      childrenCountMap.set(item._id.toString(), item.count);
    });

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

    return NextResponse.json({
      locations: tree,
      totalItems: totalRootLocations,
      hasMore: offset + limit < totalRootLocations,
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

