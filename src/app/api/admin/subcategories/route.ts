import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";

export async function POST(req: NextRequest) {
  try {
    const { name, categoryId } = await req.json();
    const slug = slugify(name);

    const subcategory = await prisma.subcategory.create({
      data: {
        name,
        slug,
        category: {
          connect: { id: parseInt(categoryId) },
        },
      },
    });

    return NextResponse.json(subcategory, { status: 201 });
  } catch (error) {
    console.error("SUBCATEGORY ERROR:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "");

  try {
    await prisma.subcategory.delete({
      where: { id },
    });
    return NextResponse.json({ message: "Subcategory deleted" });
  } catch (error) {
    console.error("SUBCATEGORY ERROR:", error);
    return NextResponse.json({ message: "Delete failed" }, { status: 500 });
  }
}

// UPDATE subcategory name + regenerate slug
export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "");
  const { name } = await req.json();

  try {
    const sub = await prisma.subcategory.update({
      where: { id },
      data: { name, slug: slugify(name) },
    });
    return NextResponse.json(sub);
  } catch {
    return NextResponse.json({ message: "Update failed" }, { status: 500 });
  }
}
