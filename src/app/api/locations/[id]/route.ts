import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Location, Machine } from '@/models';
import { locationUpdateSchema } from '@/lib/validations';

// GET /api/locations/[id] - Get a specific location
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const location = await Location.findOne({
      _id: id,
      companyId: session.user.companyId,
    })
      .populate('machines')
      .lean();

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    return NextResponse.json(location);
  } catch (error) {
    console.error('Error fetching location:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/locations/[id] - Update a location
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = locationUpdateSchema.parse(body);

    await connectDB();
    const { id } = await params;

    const location = await Location.findOne({
      _id: id,
      companyId: session.user.companyId,
    });

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // Check if parent exists and belongs to the same company
    if (validatedData.parentId && validatedData.parentId !== '') {
      const parent = await Location.findOne({
        _id: validatedData.parentId,
        companyId: session.user.companyId,
      });
      if (!parent) {
        return NextResponse.json(
          { error: 'Parent location not found' },
          { status: 404 }
        );
      }

      // Prevent circular references
      if (validatedData.parentId === id) {
        return NextResponse.json(
          { error: 'Location cannot be its own parent' },
          { status: 400 }
        );
      }

      // Check if the new parent is a descendant of this location
      const isDescendant = await isLocationDescendant(id, validatedData.parentId);
      if (isDescendant) {
        return NextResponse.json(
          { error: 'Cannot move location to its own descendant' },
          { status: 400 }
        );
      }
    } else {
      // Set parentId to null if empty string
      validatedData.parentId = undefined;
    }

    // Check for duplicate names at the same level
    if (validatedData.name) {
      const existingLocation = await Location.findOne({
        name: validatedData.name,
        parentId: validatedData.parentId || location.parentId || { $exists: false },
        companyId: session.user.companyId,
        _id: { $ne: id },
      });

      if (existingLocation) {
        return NextResponse.json(
          { error: 'Location with this name already exists at this level' },
          { status: 400 }
        );
      }
    }

    Object.assign(location, validatedData);
    await location.save();

    return NextResponse.json(location);
  } catch (error) {
    console.error('Error updating location:', error);
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

// DELETE /api/locations/[id] - Delete a location
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const location = await Location.findOne({
      _id: id,
      companyId: session.user.companyId,
    });

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // Check if there are machines in this location
    const machinesCount = await Machine.countDocuments({ locationId: id });
    if (machinesCount > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete location with machines',
          machinesCount,
          message: `This location has ${machinesCount} machine(s). Please move or delete the machines first.`
        },
        { status: 400 }
      );
    }

    // Check if there are children
    const childrenCount = await Location.countDocuments({ parentId: id });
    if (childrenCount > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete location with children',
          childrenCount,
          message: `This location has ${childrenCount} child location(s). Please delete the children first.`
        },
        { status: 400 }
      );
    }

    await Location.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error deleting location:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to check if a location is a descendant of another
async function isLocationDescendant(ancestorId: string, descendantId: string): Promise<boolean> {
  const descendant = await Location.findById(descendantId);
  if (!descendant || !descendant.parentId) {
    return false;
  }

  if (descendant.parentId.toString() === ancestorId) {
    return true;
  }

  return isLocationDescendant(ancestorId, descendant.parentId.toString());
}
