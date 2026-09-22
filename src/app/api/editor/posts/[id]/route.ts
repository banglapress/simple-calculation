import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function makeExcerpt(content: string) {
  return content
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function normalizeGallery(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
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
    galleryImages,
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
      galleryImages: JSON.stringify(normalizeGallery(galleryImages)),
      isBreaking,
      author: authorId
        ? { connect: { id: authorId } }
        : undefined,
      categories: {
        set: Array.isArray(categoryIds)
          ? categoryIds.map((id: number) => ({ id }))
          : [],
      },
      subcategories: {
        set: Array.isArray(subcategoryIds)
          ? subcategoryIds.map((id: number) => ({ id }))
          : [],
      },
    },
  });

  return NextResponse.json(updated);
}
