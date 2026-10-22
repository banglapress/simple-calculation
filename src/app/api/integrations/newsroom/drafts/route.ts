import { timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { sanitizeImageUrl, sanitizeTags, sanitizeTitle } from "@/lib/input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tokenMatches(expected: string, provided: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

function plainText(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
}

function duplicateResponse(post: { id: string; status: string }) {
  return NextResponse.json({
    ok: true,
    duplicate: true,
    postId: post.id,
    status: post.status,
    message: "This newsroom draft was already delivered to KhelaTV.",
  });
}

export async function POST(request: NextRequest) {
  const expectedToken = process.env.NEWSROOM_INTEGRATION_TOKEN?.trim();
  if (!expectedToken || expectedToken.length < 32) {
    return NextResponse.json({ message: "Newsroom integration is not configured on KhelaTV." }, { status: 503 });
  }

  const auth = request.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  const providedToken = match?.[1]?.trim() || "";
  if (!providedToken || !tokenMatches(expectedToken, providedToken)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 100000) {
      return NextResponse.json({ message: "Request body is too large." }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ message: "A valid JSON request body is required." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ message: "Invalid draft payload." }, { status: 400 });
  }
  const payload = body as Record<string, unknown>;
  const externalDraftId = typeof payload.externalDraftId === "string" ? payload.externalDraftId.trim() : "";
  const safeTitle = sanitizeTitle(payload.title);
  const rawContent = typeof payload.content === "string" ? payload.content : "";
  const safeContent = sanitizeHtml(rawContent);
  const contentText = plainText(safeContent);
  const categorySlug = typeof payload.categorySlug === "string" ? payload.categorySlug.trim() : "";
  const subcategorySlug = typeof payload.subcategorySlug === "string" ? payload.subcategorySlug.trim() : "";

  if (!externalDraftId || externalDraftId.length > 128) {
    return NextResponse.json({ message: "externalDraftId is required (max 128 characters)." }, { status: 400 });
  }
  if (!safeTitle) {
    return NextResponse.json({ message: "Article title is required." }, { status: 400 });
  }
  if (rawContent.length > 40000 || contentText.length < 10) {
    return NextResponse.json({ message: "Article body is empty or too long." }, { status: 400 });
  }

  const alreadyDelivered = await prisma.post.findUnique({
    where: { externalDraftId },
    select: { id: true, status: true },
  });
  if (alreadyDelivered) return duplicateResponse(alreadyDelivered);

  if (!categorySlug || categorySlug.length > 80) {
    return NextResponse.json({ message: "Set a valid KhelaTV category slug on the newsroom draft before sending." }, { status: 400 });
  }
  const category = await prisma.category.findUnique({ where: { slug: categorySlug }, select: { id: true } });
  if (!category) {
    return NextResponse.json({ message: `KhelaTV category '${categorySlug}' was not found. Check the category slug in the newsroom draft.` }, { status: 400 });
  }

  let subcategoryId: number | null = null;
  if (subcategorySlug) {
    const subcategory = await prisma.subcategory.findUnique({
      where: { slug: subcategorySlug },
      select: { id: true, categoryId: true },
    });
    if (!subcategory || subcategory.categoryId !== category.id) {
      return NextResponse.json({ message: `KhelaTV subcategory '${subcategorySlug}' was not found under the selected category.` }, { status: 400 });
    }
    subcategoryId = subcategory.id;
  }

  const excerptInput = typeof payload.excerpt === "string" ? payload.excerpt : "";
  const seoDescription = typeof payload.seoDescription === "string" ? payload.seoDescription : "";
  const excerpt = plainText(excerptInput || seoDescription).slice(0, 600) || contentText.slice(0, 180);
  const imageInput = typeof payload.featureImageUrl === "string" ? payload.featureImageUrl : "";
  const featureImage = sanitizeImageUrl(imageInput) || "";
  const rawTags = Array.isArray(payload.tags)
    ? payload.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean).slice(0, 20).join(", ")
    : "";
  const tags = sanitizeTags(rawTags) || "";

  try {
    const post = await prisma.post.create({
      data: {
        externalDraftId,
        title: safeTitle,
        content: safeContent,
        excerpt,
        featureImage,
        tags,
        status: "DRAFT",
        isBreaking: false,
        facebookAutoPost: false,
        facebookStatus: "NONE",
        categories: { connect: [{ id: category.id }] },
        ...(subcategoryId ? { subcategories: { connect: [{ id: subcategoryId }] } } : {}),
      },
      select: { id: true, status: true, title: true },
    });

    return NextResponse.json({
      ok: true,
      duplicate: false,
      postId: post.id,
      title: post.title,
      status: post.status,
      message: "Draft created in KhelaTV. It was not published and no Facebook post was made.",
    }, { status: 201 });
  } catch (error) {
    // The unique externalDraftId index is the final guard against concurrent retries.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const duplicate = await prisma.post.findUnique({
        where: { externalDraftId },
        select: { id: true, status: true },
      });
      if (duplicate) return duplicateResponse(duplicate);
    }
    console.error("NEWSROOM DRAFT DELIVERY ERROR:", error);
    return NextResponse.json({ message: "KhelaTV could not create the draft." }, { status: 500 });
  }
}
