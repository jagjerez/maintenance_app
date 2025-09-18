import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Location, Machine } from '@/models';

// GET /api/locations/tree - Get complete location tree with machines
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get all locations for the company
    const locations = await Location.find({ companyId: session.user.companyId })
      .sort({ path: 1 })
      .lean();

    // Get all machines for the company
    const machines = await Machine.find({ companyId: session.user.companyId })
      .populate('model')
      .populate('maintenanceRanges')
      .lean();

    // Build the tree structure
    const tree = buildLocationTreeWithMachines(locations, machines);

    return NextResponse.json(tree);
  } catch (error) {
    console.error('Error fetching location tree:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to build location tree with machines
function buildLocationTreeWithMachines(
  locations: Record<string, unknown>[],
  machines: Record<string, unknown>[],
  parentId: string | null = null
): Record<string, unknown>[] {
  const children = locations.filter(loc => 
    (parentId === null && !loc.parentId) || 
    (parentId !== null && loc.parentId && loc.parentId.toString() === parentId)
  );

  return children.map(location => {
    // Find machines in this location
    const locationMachines = machines.filter(machine => 
      machine.locationId && machine.locationId.toString() === (location._id as string).toString()
    );

    return {
      ...location,
      machines: locationMachines,
      children: buildLocationTreeWithMachines(locations, machines, (location._id as string).toString()),
    };
  });
}
