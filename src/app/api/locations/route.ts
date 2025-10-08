import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Location } from '@/models';
import { locationCreateSchema } from '@/lib/validations';
import crypto from 'crypto';

interface Machine {
  _id: string;
  internalCode: string;
  description: string;
  brand: string;
  model: string;
  series: string;
  category: string;
  state: string;
  locationId: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

interface LocationWithChildren {
  _id: string;
  name: string;
  description?: string;
  parentId?: string;
  path: string;
  level: number;
  children: LocationWithChildren[];
  machines?: Machine[];
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
    const flat = searchParams.get('flat') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    const search = searchParams.get('search') || '';

    const query: Record<string, unknown> = { companyId: session.user.companyId };
    
    // Add search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { path: { $regex: search, $options: 'i' } }
      ];
    }

    if (parentId) {
      query.parentId = parentId;
    }

    // Always include machines for read-only display with specific fields
    const populateFields = {
      path: 'machines',
      select: '_id internalCode description brand model series category state locationId companyId createdAt updatedAt'
    };

    // If includeChildren is true, get all locations for tree building
    if (includeChildren) {
      if (flat) {
        // For flat view with pagination support
        const totalItems = await Location.countDocuments(query);
        
        const allLocations = await Location.find(query)
          .populate(populateFields)
          .sort({ name: 1 })
          .skip(skip)
          .limit(limit)
          .lean();

        // For paginated results, just return the locations as-is with level information
        const flatLocations = allLocations.map((location) => ({
          ...location,
          level: 0 // For now, just set level to 0 for all locations
        }));
        
        const totalPages = Math.ceil(totalItems / limit);

        return NextResponse.json({
          locations: flatLocations,
          totalItems,
          totalPages,
          currentPage: page,
          itemsPerPage: limit
        });
      } else {
        // For tree view, get all locations without pagination
        const allLocations = await Location.find(query)
          .populate(populateFields)
          .sort({ name: 1 })
          .lean();

        const tree = buildLocationTree(allLocations as LocationWithChildren[]);
        return NextResponse.json(tree);
      }
    }

    // For regular list view, get locations with pagination at database level
    const totalItems = await Location.countDocuments(query);
    const locations = await Location.find(query)
      .populate(populateFields)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      locations,
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
      internalCode: crypto.randomUUID(),
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
      companyId: session.user.companyId
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

