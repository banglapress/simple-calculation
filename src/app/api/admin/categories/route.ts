import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";

// CREATE category
export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    const slug = slugify(name);

    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ message: "Slug already exists" }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: { name, slug },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Category creation error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// GET all categories + subcategories
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: { subcategories: true },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Category get error:", error);
    return NextResponse.json({ message: "Failed to fetch" }, { status: 500 });
  }
}

// DELETE a category
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "");

  try {
    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Category deleted" });
  } catch (error) {
    console.error("Category delete error:", error);
    return NextResponse.json({ message: "Delete failed" }, { status: 500 });
  }
}

// UPDATE category name + regenerate slug
export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "");
  const { name } = await req.json();

  try {
    const updated = await prisma.category.update({
      where: { id },
      data: { name, slug: slugify(name) },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.log(error)
    return NextResponse.json({ message: "Update failed" }, { status: 500 });
  }
}
