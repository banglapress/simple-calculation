import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const VALID_STATUSES = ["DRAFT", "PENDING", "PUBLISHED"] as const;
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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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

  const normalizedCategoryIds = toIdArray(categoryIds, categoryId);
  const normalizedSubcategoryIds = toIdArray(
    subcategoryIds,
    subcategoryId
  );
  const normalizedStatus = normalizedValue(
    status,
    VALID_STATUSES,
    "DRAFT"
  );
  const normalizedPlacement = normalizedValue(
    placement,
    VALID_PLACEMENTS,
    "NONE"
  );
  const normalizedBreaking = Boolean(isBreaking);

  if (!title?.trim()) {
    return NextResponse.json({ message: "Title is required" }, { status: 400 });
  }

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

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  // A reporter can save a DRAFT, or send it for editorial review.
  // A reporter can never create a PUBLISHED post directly.
  let normalizedReporterStatus = normalizedStatus;
  if (user.role === "REPORTER" && normalizedStatus !== "DRAFT") {
    normalizedReporterStatus = "PENDING";
  }

  try {
    const post = await prisma.post.create({
      data: {
        title: title.trim(),
        content: content ?? "",
        excerpt: makeExcerpt(content ?? ""),
        featureImage: featureImage || "",
        status: normalizedReporterStatus,
        placement: normalizedPlacement,
        isBreaking: normalizedBreaking,
        tags,
        author: { connect: { id: user.id } },
        categories: {
          connect: normalizedCategoryIds.map((id: number) => ({ id })),
        },
        subcategories: {
          connect: normalizedSubcategoryIds.map((id: number) => ({ id })),
        },
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error("POST ERROR:", error);
    return NextResponse.json(
      { message: "Failed to create post" },
      { status: 500 }
    );
  }
}
