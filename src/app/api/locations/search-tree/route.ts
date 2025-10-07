import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Location, Machine } from '@/models';
import { IMachine } from '@/models/Machine';
import mongoose from 'mongoose';

interface LocationNode {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  path: string;
  level: number;
  isLeaf: boolean;
  parentId?: string;
  machines: IMachine[];
  children: LocationNode[];
  childrenCount?: number;
  hasChildren?: boolean;
}

// GET /api/locations/search-tree - Search locations with full hierarchy
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!search.trim()) {
      // If no search query, return regular tree
      const response = await fetch(`${request.nextUrl.origin}/api/locations/tree?limit=${limit}&offset=${offset}`);
      return response;
    }

    // Search query for locations
    const searchQuery = {
      companyId: session.user.companyId,
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { path: { $regex: search, $options: 'i' } }
      ]
    };

    // Find all locations that match the search
    const matchingLocations = await Location.find(searchQuery)
      .sort({ name: 1 })
      .lean();

    if (matchingLocations.length === 0) {
      return NextResponse.json({
        locations: [],
        totalItems: 0,
        hasMore: false,
        offset: 0,
        limit
      });
    }

    // Get all parent IDs of matching locations
    const allParentIds = new Set<string>();
    const matchingLocationIds = new Set(matchingLocations.map(loc => loc._id.toString()));

    // Function to get all parent IDs recursively
    const getAllParentIds = async (locationIds: string[]) => {
      if (locationIds.length === 0) return;
      
      
      // Convert string IDs back to ObjectIds for the query
      const objectIds = locationIds.map(id => new mongoose.Types.ObjectId(id));
      
      const parents = await Location.find({
        _id: { $in: objectIds },
        companyId: session.user.companyId
      }).select('parentId').lean();


      const newParentIds: string[] = [];
      for (const parent of parents) {
        if (parent.parentId && !allParentIds.has(parent.parentId.toString())) {
          allParentIds.add(parent.parentId.toString());
          newParentIds.push(parent.parentId.toString());
        }
      }

      if (newParentIds.length > 0) {
        await getAllParentIds(newParentIds);
      }
    };

    // Get all parent IDs - we need to get the complete parent chain
    const initialParentIds = matchingLocations
      .map(loc => loc.parentId)
      .filter((id): id is string => id !== null && id !== undefined)
      .map(id => id.toString());


    if (initialParentIds.length > 0) {
      await getAllParentIds(initialParentIds);
    }

    // Get all relevant locations (matching + their parents)
    const allRelevantIds = [
      ...matchingLocationIds,
      ...Array.from(allParentIds)
    ];


    // Also include the direct parent of the matching location if it's not already included
    const directParentIds = matchingLocations
      .map(loc => loc.parentId)
      .filter((id): id is string => id !== null && id !== undefined)
      .map(id => id.toString());

    directParentIds.forEach(parentId => {
      if (!allRelevantIds.includes(parentId)) {
        allRelevantIds.push(parentId);
      }
    });

    // Convert string IDs to ObjectIds for the query
    const objectIds = allRelevantIds.map(id => new mongoose.Types.ObjectId(id));
    
    const allRelevantLocations = await Location.find({
      _id: { $in: objectIds },
      companyId: session.user.companyId
    }).sort({ name: 1 }).lean();


    // Get machines for all relevant locations
    const machines = await Machine.find({ 
      locationId: { $in: objectIds },
      companyId: session.user.companyId 
    })
      .populate('model')
      .lean();

    // Build the tree structure with only relevant locations
    const locationMap = new Map();
    allRelevantLocations.forEach(loc => {
      locationMap.set(loc._id.toString(), {
        ...loc,
        machines: [],
        children: [],
        childrenCount: 0,
        hasChildren: false,
        isLeaf: true
      });
    });

    // Add machines to locations
    machines.forEach(machine => {
      const locationId = machine.locationId?.toString();
      if (locationId && locationMap.has(locationId)) {
        locationMap.get(locationId).machines.push(machine);
      }
    });

    // Build the complete tree structure recursively
    const rootLocations: LocationNode[] = [];
    const processedIds = new Set<string>();

    // Function to recursively build tree from a location
    const buildTreeFromLocation = (location: LocationNode): LocationNode | null => {
      if (!location || processedIds.has(location._id.toString())) {
        return null;
      }
      
      processedIds.add(location._id.toString());
      
      // Get all children of this location from relevant locations
      const children = allRelevantLocations.filter(child => 
        child.parentId && child.parentId.toString() === location._id.toString()
      );

      // Recursively build children
      const builtChildren = children.map(child => {
        const childLocation = locationMap.get(child._id.toString());
        return buildTreeFromLocation(childLocation);
      }).filter((child): child is LocationNode => child !== null);

      // Update location with children
      return {
        ...location,
        children: builtChildren,
        childrenCount: builtChildren.length,
        hasChildren: builtChildren.length > 0,
        isLeaf: builtChildren.length === 0
      };
    };

    // Find all root locations (locations that don't have a parent in our relevant set)
    // A location is a root if:
    // 1. It has no parentId (null or undefined)
    // 2. Its parentId is not in our allRelevantIds set
    const rootLevelLocations = allRelevantLocations.filter(loc => {
      if (!loc.parentId) {
        return true; // No parent, so it's a root
      }
      // Check if parent is in our relevant set
      const parentIdStr = loc.parentId.toString();
      return !allRelevantIds.includes(parentIdStr);
    });


    // Build tree for each root location
    rootLevelLocations.forEach(loc => {
      const location = locationMap.get(loc._id.toString());
      if (location) {
        const treeLocation = buildTreeFromLocation(location);
        if (treeLocation) {
          rootLocations.push(treeLocation);
        }
      }
    });

    // Apply pagination to root locations
    const paginatedRoots = rootLocations.slice(offset, offset + limit);
    const hasMore = offset + limit < rootLocations.length;

    return NextResponse.json({
      locations: paginatedRoots,
      totalItems: rootLocations.length,
      hasMore,
      offset,
      limit,
      searchQuery: search
    });
  } catch (error) {
    console.error('Error searching location tree:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
