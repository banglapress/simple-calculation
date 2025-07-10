import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ✅ Correct GET handler
export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const id = context.params.id; // ✅ Access params via context

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      categories: true,
      subcategories: true,
    },
  });

  return NextResponse.json(post);
}

// ✅ Correct PUT handler
export async function PUT(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const id = context.params.id; // ✅ Same fix here

  const {
    title,
    content,
    tags,
    status,
    placement,
    featureImage,
    isBreaking,
    authorId,
    categoryIds,
    subcategoryIds,
  } = await req.json();

  const updated = await prisma.post.update({
    where: { id },
    data: {
      title,
      content,
      tags,
      status,
      placement,
      featureImage,
      isBreaking,
      author: { connect: { id: authorId } },
      categories: { set: categoryIds.map((id: number) => ({ id })) },
      subcategories: { set: subcategoryIds.map((id: number) => ({ id })) },
    },
  });

  return NextResponse.json(updated);
}
