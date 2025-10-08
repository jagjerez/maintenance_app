import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/db";
import { Machine } from "@/models";
import { machineUpdateSchema } from "@/lib/validations";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const machine = await Machine.findOne({
      _id: id,
      companyId: session.user.companyId,
    });

    if (!machine) {
      return NextResponse.json({ error: "Machine not found" }, { status: 404 });
    }

    return NextResponse.json(machine);
  } catch (error) {
    console.error("Error fetching machine:", error);
    return NextResponse.json(
      { error: "Failed to fetch machine" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();
    const validatedData = machineUpdateSchema.parse(body);

    const { id } = await params;

    // Get current machine to check if we need to validate
    const currentMachine = await Machine.findOne({
      _id: id,
      companyId: session.user.companyId,
    });
    if (!currentMachine) {
      return NextResponse.json({ error: "Machine not found" }, { status: 404 });
    }

    // Validate no duplicate internal code (only if internalCode is being updated)
    if (validatedData.internalCode && validatedData.internalCode !== currentMachine.internalCode) {
      const existingMachine = await Machine.findOne({
        _id: { $ne: id },
        internalCode: validatedData.internalCode,
        companyId: session.user.companyId,
      });

      if (existingMachine) {
        return NextResponse.json(
          { error: "duplicateInternalCode" },
          { status: 400 }
        );
      }
    }

    const updateData = { ...validatedData } as Record<string, unknown>;
    
    // Convert string IDs to ObjectIds for MongoDB
    if (updateData.locationId && typeof updateData.locationId === 'string') {
      updateData.locationId = new mongoose.Types.ObjectId(updateData.locationId);
    }
    
    if (updateData.rootId && typeof updateData.rootId === 'string') {
      updateData.rootId = new mongoose.Types.ObjectId(updateData.rootId);
    }
    
    
    // Find the machine first
    const machine = await Machine.findOne({ _id: id, companyId: session.user.companyId });
    
    if (!machine) {
      return NextResponse.json({ error: "Machine not found" }, { status: 404 });
    }

    // Update the fields manually - force assignment for all fields
    Object.assign(machine, updateData);
    
    // Force mark ALL fields as modified to ensure Mongoose saves them
    Object.keys(updateData).forEach(key => {
      machine.markModified(key);
    });
    
    // Save the machine
    await machine.save();


    return NextResponse.json(machine);
  } catch (error) {
    console.error("Error updating machine:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update machine" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const machine = await Machine.findOneAndUpdate(
      { _id: id, companyId: session.user.companyId },
      { deletedAt: new Date() },
      { new: true }
    );

    if (!machine) {
      return NextResponse.json({ error: "Machine not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Machine deleted successfully" });
  } catch (error) {
    console.error("Error deleting machine:", error);
    return NextResponse.json(
      { error: "Failed to delete machine" },
      { status: 500 }
    );
  }
}
