import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/db";
import { Machine } from "@/models";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get distinct categories for the user's company
    const categories = await Machine.distinct("category", {
      companyId: session.user.companyId,
      deletedAt: null,
    });

    // Sort categories alphabetically
    const sortedCategories = categories
      .filter(category => category && category.trim() !== "")
      .sort();

    return NextResponse.json({
      categories: sortedCategories,
    });
  } catch (error) {
    console.error("Error fetching machine categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch machine categories" },
      { status: 500 }
    );
  }
}
