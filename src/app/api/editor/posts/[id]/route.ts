import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function makeExcerpt(content: string) {
  return content
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const id = context.params.id;

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      categories: true,
      subcategories: true,
    },
  });

  return NextResponse.json(post);
}

export async function PUT(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const id = context.params.id;

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
      excerpt: makeExcerpt(content ?? ""),
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
