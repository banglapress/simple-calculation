import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

async function requireEditorOrAdmin() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "EDITOR" && role !== "ADMIN")) {
    return null;
  }
  return session;
}

export async function POST(req: NextRequest) {
  const session = await requireEditorOrAdmin();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 403 });

  try {
    const { name, categoryId } = await req.json();
    const slug = slugify(name);

    const subcategory = await prisma.subcategory.create({
      data: {
        name,
        slug,
        category: { connect: { id: parseInt(categoryId) } },
      },
    });

    return NextResponse.json(subcategory, { status: 201 });
  } catch (error) {
    console.error("SUBCATEGORY ERROR:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireEditorOrAdmin();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 403 });

  const id = parseInt(new URL(req.url).searchParams.get("id") || "");

  try {
    await prisma.subcategory.delete({ where: { id } });
    return NextResponse.json({ message: "Subcategory deleted" });
  } catch (error) {
    console.error("SUBCATEGORY ERROR:", error);
    return NextResponse.json({ message: "Delete failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await requireEditorOrAdmin();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 403 });

  const id = parseInt(new URL(req.url).searchParams.get("id") || "");
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
