import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Location } from '@/models';
import { locationCreateSchema } from '@/lib/validations';

interface LocationWithChildren {
  _id: string;
  name: string;
  description?: string;
  parentId?: string;
  path: string;
  level: number;
  children: LocationWithChildren[];
  machines?: unknown[];
}

interface FlatLocation {
  _id: string;
  name: string;
  description?: string;
  parentId?: string;
  path: string;
  level: number;
  machines?: unknown[];
}

// GET /api/locations - Get all locations for a company
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    const includeChildren = searchParams.get('includeChildren') === 'true';
    const includeMachines = searchParams.get('includeMachines') === 'true';
    const flat = searchParams.get('flat') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    const rootOnly = searchParams.get('rootOnly') === 'true';

    const query: Record<string, unknown> = { companyId: session.user.companyId };

    if (rootOnly) {
      query.parentId = { $exists: false };
    } else if (parentId) {
      query.parentId = parentId;
    }

    let populateFields = '';
    if (includeMachines) {
      populateFields = 'machines';
    }

    // If includeChildren is true, get all locations for tree building
    if (includeChildren) {
      const allLocations = await Location.find(query)
        .populate(populateFields)
        .sort({ name: 1 })
        .lean();

      if (flat) {
        // Return flat array with level information for dropdown
        const flatLocations = flattenLocationTree(allLocations as LocationWithChildren[]);
        return NextResponse.json(flatLocations);
      } else {
        const tree = buildLocationTree(allLocations as LocationWithChildren[]);
        return NextResponse.json(tree);
      }
    }

    // For regular list view, get all locations and flatten them for pagination
    const allLocations = await Location.find(query)
      .populate(populateFields)
      .sort({ name: 1 })
      .lean();

    // Flatten the tree structure for list view
    const flatLocations = flattenLocationTree(allLocations as LocationWithChildren[]);
    
    // Apply pagination to flattened results
    const totalItems = flatLocations.length;
    const paginatedLocations = flatLocations.slice(skip, skip + limit);
    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      locations: paginatedLocations,
      totalItems,
      totalPages,
      currentPage: page,
      itemsPerPage: limit
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/locations - Create a new location
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Clean parentId before validation
    if (body.parentId === '' || body.parentId === undefined) {
      body.parentId = null;
    }
    
    const validatedData = locationCreateSchema.parse(body);
    const dataWithCompany = {
      ...validatedData,
      companyId: session.user.companyId,
    };
    
    await connectDB();

    // Check if parent exists and belongs to the same company
    if (dataWithCompany.parentId && dataWithCompany.parentId !== null) {
      const parent = await Location.findOne({
        _id: dataWithCompany.parentId,
        companyId: session.user.companyId
      });
      if (!parent) {
        return NextResponse.json(
          { error: 'Parent location not found' },
          { status: 404 }
        );
      }
    }

    // Check for duplicate names at the same level
    const existingLocation = await Location.findOne({
      name: dataWithCompany.name,
      parentId: dataWithCompany.parentId || { $exists: false },
      companyId: session.user.companyId,
      internalCode: crypto.randomUUID()
    });

    if (existingLocation) {
      return NextResponse.json(
        { error: 'Location with this name already exists at this level' },
        { status: 400 }
      );
    }

    const location = new Location(dataWithCompany);
    await location.save();

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    console.error('Error creating location:', error);
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to build location tree
function buildLocationTree(locations: LocationWithChildren[], parentId: string | null = null): LocationWithChildren[] {
  const children = locations.filter(loc => 
    (parentId === null && !loc.parentId) || 
    (parentId !== null && loc.parentId && loc.parentId.toString() === parentId)
  );

  return children.map(location => ({
    ...location,
    children: buildLocationTree(locations, location._id.toString()),
  }));
}

// Helper function to flatten location tree with level information
function flattenLocationTree(locations: LocationWithChildren[], parentId: string | null = null, level: number = 0): FlatLocation[] {
  const children = locations.filter(loc => 
    (parentId === null && !loc.parentId) || 
    (parentId !== null && loc.parentId && loc.parentId.toString() === parentId)
  );

  const result: FlatLocation[] = [];
  
  children.forEach(location => {
    result.push({
      ...location,
      level: level
    });
    
    // Recursively add children
    const childLocations = flattenLocationTree(locations, location._id.toString(), level + 1);
    result.push(...childLocations);
  });

  return result;
}
