// src/app/api/editor/posts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET post by ID
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const post = await prisma.post.findUnique({
    where: { id: params.id },
    include: { categories: true, subcategories: true },
  });
  return NextResponse.json(post);
}

// UPDATE post
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const {
    title,
    content,
    tags,
    status,
    featureImage,
    authorId,
    categoryIds,
    subcategoryIds,
  } = await req.json();

  try {
    const updated = await prisma.post.update({
      where: { id: params.id },
      data: {
        title,
        content,
        tags,
        status,
        featureImage,
        authorId,
        categories: {
          set: categoryIds.map((id: number) => ({ id })),
        },
        subcategories: {
          set: subcategoryIds.map((id: number) => ({ id })),
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("UPDATE ERROR:", error);
    return NextResponse.json({ message: "Update failed" }, { status: 500 });
  }
}
