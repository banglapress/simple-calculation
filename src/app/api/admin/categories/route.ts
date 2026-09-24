import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { invalidatePublicCategoriesCache } from "@/lib/public-data";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

async function requireEditorOrAdmin() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "EDITOR" && role !== "ADMIN")) {
    return null;
  }
  return session;
}

// CREATE category
export async function POST(req: NextRequest) {
  const session = await requireEditorOrAdmin();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 403 });

  try {
    const { name, slug: requestedSlug } = await req.json();
    const slug = String(requestedSlug || "").trim().toLowerCase();

    if (!slug) {
      return NextResponse.json(
        { message: "English slug আবশ্যক। যেমন: football বা swimming" },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        { message: "English slug দিন। যেমন: football বা swimming" },
        { status: 400 }
      );
    }

    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ message: "Slug already exists" }, { status: 400 });
    }

    const lastCategory = await prisma.category.findFirst({
      orderBy: [{ navOrder: "desc" }, { id: "desc" }],
      select: { navOrder: true },
    });

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        showInNav: true,
        navOrder: (lastCategory?.navOrder || 0) + 1,
      },
    });

    invalidatePublicCategoriesCache();
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Category creation error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// GET all categories + subcategories
export async function GET() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "EDITOR" && role !== "ADMIN")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const categories = await prisma.category.findMany({
      include: { subcategories: true },
      orderBy: [{ navOrder: "asc" }, { id: "asc" }],
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Category get error:", error);
    return NextResponse.json({ message: "Failed to fetch" }, { status: 500 });
  }
}

// DELETE a category
export async function DELETE(req: NextRequest) {
  const session = await requireEditorOrAdmin();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "");

  try {
    await prisma.category.delete({ where: { id } });
    invalidatePublicCategoriesCache();
    return NextResponse.json({ message: "Category deleted" });
  } catch (error) {
    console.error("Category delete error:", error);
    return NextResponse.json({ message: "Delete failed" }, { status: 500 });
  }
}

// UPDATE category name + slug + navigation settings
export async function PATCH(req: NextRequest) {
  const session = await requireEditorOrAdmin();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "");
  const { name, slug: requestedSlug, showInNav, navOrder } = await req.json();

  try {
    const slug = String(requestedSlug || "").trim().toLowerCase();

    if (!slug) {
      return NextResponse.json(
        { message: "English slug আবশ্যক। যেমন: football বা swimming" },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        { message: "English slug দিন। যেমন: football বা swimming" },
        { status: 400 }
      );
    }

    const data: {
      name: string;
      slug: string;
      showInNav?: boolean;
      navOrder?: number;
    } = { name, slug };

    if (typeof showInNav === "boolean") data.showInNav = showInNav;
    if (Number.isInteger(navOrder) && navOrder > 0) data.navOrder = navOrder;

    const updated = await prisma.category.update({ where: { id }, data });
    invalidatePublicCategoriesCache();
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Category update error:", error);
    return NextResponse.json({ message: "Update failed" }, { status: 500 });
  }
}
