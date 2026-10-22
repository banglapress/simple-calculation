import { createHmac, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { sanitizeImageUrl, sanitizeTags, sanitizeTitle } from "@/lib/input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function signatureMatches(secret: string, timestamp: string, rawBody: string, signature: string): boolean {
  if (!/^\\d{10}$/.test(timestamp) || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const time = Number(timestamp);
  if (!Number.isFinite(time) || Math.abs(Math.floor(Date.now() / 1000) - time) > 300) return false;
  const expected = createHmac("sha256", secret).update(timestamp + "." + rawBody).digest();
  const provided = Buffer.from(signature, "hex");
  return expected.length === provided.length && timingSafeEqual(expected, provided);
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
  const integrationSecret = process.env.NEWSROOM_INTEGRATION_TOKEN?.trim();
  if (!integrationSecret || integrationSecret.length < 32) {
    return NextResponse.json({ message: "Newsroom integration is not configured on KhelaTV." }, { status: 503 });
  }

  let rawBody = "";
  try {
    rawBody = await request.text();
    if (rawBody.length > 100000) {
      return NextResponse.json({ message: "Request body is too large." }, { status: 413 });
    }
  } catch {
    return NextResponse.json({ message: "A valid JSON request body is required." }, { status: 400 });
  }

  const timestamp = request.headers.get("x-newsroom-timestamp") || "";
  const signature = request.headers.get("x-newsroom-signature") || "";
  if (!signatureMatches(integrationSecret, timestamp, rawBody, signature)) {
    return NextResponse.json({ message: "Unauthorized or expired integration signature." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
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
