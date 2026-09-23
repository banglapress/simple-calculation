import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const VALID_STATUSES = ["DRAFT", "PENDING"] as const;
const VALID_PLACEMENTS = [
  "NONE",
  "LEAD",
  "SECOND_LEAD",
  "EDITORS_PICK",
  "TRENDING",
] as const;

function makeExcerpt(content: string) {
  return content
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function toIdArray(value: unknown, fallback?: unknown) {
  const source = Array.isArray(value)
    ? value
    : fallback !== undefined && fallback !== null && fallback !== ""
    ? [fallback]
    : [];

  return source
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
}

function normalizedValue<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number]
): T[number] {
  return typeof value === "string" &&
    (allowed as readonly string[]).includes(value)
    ? (value as T[number])
    : fallback;
}

async function getReporterPost(postId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return {
      response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });

  if (!user || user.role !== "REPORTER") {
    return {
      response: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
    };
  }

  const post = await prisma.post.findFirst({
    where: {
      id: postId,
      authorId: user.id,
    },
    include: {
      categories: true,
      subcategories: true,
    },
  });

  if (!post) {
    return {
      response: NextResponse.json(
        { message: "Post not found" },
        { status: 404 }
      ),
    };
  }

  return { user, post };
}

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  void req;

  try {
    const result = await getReporterPost(context.params.id);

    if ("response" in result) {
      return result.response;
    }

    return NextResponse.json(result.post, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("REPORTER POST GET ERROR:", error);
    return NextResponse.json(
      { message: "Post load failed" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const result = await getReporterPost(context.params.id);

    if ("response" in result) {
      return result.response;
    }

    if (result.post.status === "PUBLISHED") {
      return NextResponse.json(
        { message: "Published posts cannot be edited from reporter panel" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const {
      title,
      content,
      featureImage,
      categoryIds,
      categoryId,
      subcategoryIds,
      subcategoryId,
      tags,
      status,
      placement,
      isBreaking,
    } = body;

    if (!String(title || "").trim()) {
      return NextResponse.json(
        { message: "Title is required" },
        { status: 400 }
      );
    }

    const normalizedCategoryIds = toIdArray(categoryIds, categoryId);
    const normalizedSubcategoryIds = toIdArray(
      subcategoryIds,
      subcategoryId
    );

    if (!normalizedCategoryIds.length) {
      return NextResponse.json(
        { message: "একটি category নির্বাচন করুন" },
        { status: 400 }
      );
    }

    if (normalizedSubcategoryIds.length > 0) {
      const validSubcategories = await prisma.subcategory.findMany({
        where: {
          id: { in: normalizedSubcategoryIds },
          categoryId: { in: normalizedCategoryIds },
        },
        select: { id: true },
      });

      if (validSubcategories.length !== normalizedSubcategoryIds.length) {
        return NextResponse.json(
          { message: "Subcategory does not belong to selected category" },
          { status: 400 }
        );
      }
    }

    const requestedStatus = normalizedValue(
      status,
      VALID_STATUSES,
      result.post.status === "PENDING" ? "PENDING" : "DRAFT"
    );

    const normalizedPlacement = normalizedValue(
      placement,
      VALID_PLACEMENTS,
      "NONE"
    );

    const post = await prisma.post.update({
      where: { id: result.post.id },
      data: {
        title: String(title).trim(),
        content: typeof content === "string" ? content : "",
        excerpt: makeExcerpt(typeof content === "string" ? content : ""),
        featureImage:
          typeof featureImage === "string" && featureImage.trim()
            ? featureImage.trim()
            : undefined,
        tags: typeof tags === "string" ? tags : undefined,
        status: requestedStatus,
        placement: normalizedPlacement,
        isBreaking: Boolean(isBreaking),
        categories: {
          set: normalizedCategoryIds.map((id) => ({ id })),
        },
        subcategories: {
          set: normalizedSubcategoryIds.map((id) => ({ id })),
        },
      },
      include: {
        categories: true,
        subcategories: true,
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error("REPORTER POST UPDATE ERROR:", error);

    const message =
      error instanceof Error ? error.message : "Failed to update post";

    return NextResponse.json(
      { message: "পোস্ট সংরক্ষণ করা যায়নি", detail: message },
      { status: 500 }
    );
  }
}
