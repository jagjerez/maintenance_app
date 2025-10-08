import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/db";
import { Machine } from "@/models";
import { machineCreateSchema } from "@/lib/validations";
import { authOptions } from "@/lib/auth";
import crypto from 'crypto';
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const locationId = searchParams.get("locationId");
    const skip = (page - 1) * limit;

    // Build search query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = { companyId: session.user.companyId };

    if (locationId) {
      query.locationId = new mongoose.Types.ObjectId(locationId);
    }

    if (search) {
      query.$or = [
        { description: { $regex: search, $options: "i" } },
        { model: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { series: { $regex: search, $options: "i" } },
        { state: { $regex: search, $options: "i" } },
      ];
    }
    const totalItems = await Machine.countDocuments(query);
    const machines = await Machine.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const totalPages = Math.ceil(totalItems / limit);


    return NextResponse.json({
      machines,
      totalItems,
      totalPages,
      currentPage: page,
      itemsPerPage: limit,
    });
  } catch (error) {
    console.error("Error fetching machines:", error);
    return NextResponse.json(
      { error: "Failed to fetch machines" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();
    const validatedData = machineCreateSchema.parse(body);
    const dataWithCompany = {
      ...validatedData,
      internalCode: crypto.randomUUID(),
      companyId: session.user.companyId,
    } as Record<string, unknown>;
    
    // Convert string IDs to ObjectIds for MongoDB
    if (dataWithCompany.locationId && typeof dataWithCompany.locationId === 'string') {
      dataWithCompany.locationId = new mongoose.Types.ObjectId(dataWithCompany.locationId);
    }
    
    if (dataWithCompany.rootId && typeof dataWithCompany.rootId === 'string') {
      dataWithCompany.rootId = new mongoose.Types.ObjectId(dataWithCompany.rootId);
    }


    // Validate no duplicate internal code
    const existingMachine = await Machine.findOne({
      internalCode: dataWithCompany.internalCode,
      companyId: session.user.companyId,
    });

    if (existingMachine) {
      return NextResponse.json(
        { error: "duplicateInternalCode" },
        { status: 400 }
      );
    }

    // For corrective maintenance ranges, ensure no operations are saved
    const machineData = { ...dataWithCompany };

    const machine = new Machine(machineData);
    await machine.save();

    return NextResponse.json(machine, { status: 201 });
  } catch (error) {
    console.error("Error creating machine:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create machine" },
      { status: 500 }
    );
  }
}
