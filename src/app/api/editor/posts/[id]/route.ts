import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { publishPostToFacebook } from "@/lib/post-publishing";
import { sanitizeHtml } from "@/lib/sanitize-html";
import {
  sanitizeImageUrl,
  sanitizeImageUrlList,
  sanitizeTags,
  sanitizeTitle,
} from "@/lib/input";

function allowed(role?: string | null) {
  return role === "EDITOR" || role === "ADMIN";
}

function makeExcerpt(content: string) {
  return content
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!allowed(session?.user?.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  const post = await prisma.post.findUnique({
    where: { id },
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

  if (!post) {
    return NextResponse.json({ message: "Post not found" }, { status: 404 });
  }

  return NextResponse.json(post);
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!allowed(session?.user?.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id } = await context.params;
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
    status === "PUBLISHED"
      ? "PUBLISHED"
      : status === "PENDING"
      ? "PENDING"
      : "DRAFT";

  const safeTitle = sanitizeTitle(title);
  if (!safeTitle) {
    return NextResponse.json(
      { message: "শিরোনাম খালি রাখা যাবে না" },
      { status: 400 }
    );
  }

  const safeTags = sanitizeTags(tags);
  const safeFeatureImage = sanitizeImageUrl(featureImage);
  const safeFacebookImage = sanitizeImageUrl(facebookImageUrl);
  const safeGallery = sanitizeImageUrlList(galleryImages, 20);
  const safeContent =
    typeof content === "string" ? sanitizeHtml(content) : "";
  const safeCaption =
    typeof facebookCaption === "string"
      ? facebookCaption.replace(/[\u0000-\u001F\u007F]/g, "").slice(0, 5000)
      : undefined;

  const categoryIdList = Array.isArray(categoryIds)
    ? categoryIds
        .map((value: unknown) => Number(value))
        .filter((value: number) => Number.isInteger(value) && value > 0)
    : [];

  const subcategoryIdList = Array.isArray(subcategoryIds)
    ? subcategoryIds
        .map((value: unknown) => Number(value))
        .filter((value: number) => Number.isInteger(value) && value > 0)
    : [];

  const shouldAutoPost =
    typeof facebookAutoPost === "boolean"
      ? facebookAutoPost
      : undefined;

  try {
    const existing = await prisma.post.findUnique({
      where: { id },
      select: { id: true, authorId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Post not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.post.update({
      where: { id },
      data: {
        title: safeTitle,
        content: safeContent,
        excerpt: makeExcerpt(safeContent),
        tags: safeTags,
        status: normalizedStatus,
        placement,
        featureImage: safeFeatureImage,
        facebookImageUrl: safeFacebookImage,
        galleryImages: JSON.stringify(safeGallery),
        isBreaking: Boolean(isBreaking),
        facebookCaption: safeCaption,
        facebookAutoPost: shouldAutoPost,
        facebookError:
          normalizedStatus !== "PUBLISHED" ? null : undefined,
        author:
          typeof authorId === "string" && authorId.trim()
            ? { connect: { id: authorId.trim() } }
            : undefined,
        categories: {
          set: categoryIdList.map((categoryId: number) => ({
            id: categoryId,
          })),
        },
        subcategories: {
          set: subcategoryIdList.map((subcategoryId: number) => ({
            id: subcategoryId,
          })),
        },
      },
    });

    const facebook =
      normalizedStatus === "PUBLISHED"
        ? await publishPostToFacebook(id)
        : null;

    const final = await prisma.post.findUnique({
      where: { id },
    });

    return NextResponse.json({
      post: final || updated,
      facebook,
    });
  } catch (error) {
    console.error("EDITOR POST UPDATE ERROR:", error);

    const message =
      error instanceof Error ? error.message : "Failed to update post";

    return NextResponse.json(
      {
        message: "পোস্ট সংরক্ষণ করা যায়নি",
        detail: message,
      },
      { status: 500 }
    );
  }
}
