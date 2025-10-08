import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Location } from '@/models';
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
    const query: Record<string, unknown> = { companyId: session.user.companyId };
    
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

    // Don't preload machines - they will be loaded on demand when nodes are expanded


    // Get children count for each location - Batch query for better performance
    const locationIds = locations.map(loc => loc._id);
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

    // Build locations without preloading machines or children
    const tree = locations.map(location => {
      const childrenCount = childrenCountMap.get(location._id.toString()) || 0;

      return {
        ...location,
        machines: [], // Will be loaded on demand when node is expanded
        children: [], // Will be loaded on demand
        childrenCount: childrenCount, // Number of children available
        hasChildren: childrenCount > 0, // Boolean flag for easy checking
        isLeaf: childrenCount === 0, // True if no children
        machinesLoaded: false, // Track if machines have been loaded
        childrenLoaded: false, // Track if children have been loaded
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

