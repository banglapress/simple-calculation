import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { publishPostToFacebook } from "@/lib/post-publishing";

function allowed(role?: string | null) {
  return role === "EDITOR" || role === "ADMIN";
}

function makeExcerpt(content: string) {
  return content.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 180);
}

function normalizeGallery(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string")
    .map((item) => item.trim()).filter(Boolean).slice(0, 20);
}

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!allowed(session?.user?.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const post = await prisma.post.findUnique({
    where: { id: context.params.id },
    include: {
      categories: true,
      subcategories: true,
      deskStory: {
        include: {
          sources: {
            include: { feed: { select: { name: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  return NextResponse.json(post);
}

export async function PUT(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!allowed(session?.user?.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
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
    facebookCaption,
    facebookAutoPost,
    facebookImageUrl,
  } = body;

  const normalizedStatus =
    status === "PUBLISHED" ? "PUBLISHED" :
    status === "PENDING" ? "PENDING" : "DRAFT";

  const shouldAutoPost =
    typeof facebookAutoPost === "boolean"
      ? facebookAutoPost
      : undefined;

  const updated = await prisma.post.update({
    where: { id },
    data: {
      title,
      content,
      excerpt: makeExcerpt(content ?? ""),
      tags,
      status: normalizedStatus,
      placement,
      featureImage,
      facebookImageUrl:
        typeof facebookImageUrl === "string"
          ? facebookImageUrl.trim()
          : undefined,
      galleryImages: JSON.stringify(normalizeGallery(galleryImages)),
      isBreaking,
      facebookCaption:
        typeof facebookCaption === "string" ? facebookCaption : undefined,
      facebookAutoPost: shouldAutoPost,
      facebookError:
        normalizedStatus !== "PUBLISHED" ? null : undefined,
      author: authorId ? { connect: { id: authorId } } : undefined,
      categories: {
        set: Array.isArray(categoryIds)
          ? categoryIds.map((categoryId: number) => ({ id: categoryId }))
          : [],
      },
      subcategories: {
        set: Array.isArray(subcategoryIds)
          ? subcategoryIds.map((subcategoryId: number) => ({ id: subcategoryId }))
          : [],
      },
    },
  });

  const facebook =
    normalizedStatus === "PUBLISHED"
      ? await publishPostToFacebook(id)
      : null;

  const final = await prisma.post.findUnique({ where: { id } });

  return NextResponse.json({
    post: final || updated,
    facebook,
  });
}
