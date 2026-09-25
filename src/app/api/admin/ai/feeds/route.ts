import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { fetchRSSFeed, filterRSSItems } from "@/lib/rss";
import { rateLimitActor, rateLimitResponse } from "@/lib/rate-limit";

type AuthSession = {
  user?: { role?: string | null } | null;
} | null;

function allowed(session: AuthSession) {
  return session?.user?.role === "ADMIN" || session?.user?.role === "EDITOR";
}

function normalizeKeywords(value: unknown) {
  return String(value || "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join("\n");
}

function normalizeMinRelevance(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 60;
  return Math.min(100, Math.max(0, Math.round(number)));
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!allowed(session)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const feeds = await prisma.newsFeed.findMany({
    orderBy: { id: "asc" },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });

  return NextResponse.json(feeds);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!allowed(session)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const url = String(body.url || "").trim();
    const includeKeywords = normalizeKeywords(body.includeKeywords);
    const excludeKeywords = normalizeKeywords(body.excludeKeywords);
    const minRelevance = normalizeMinRelevance(body.minRelevance);
    const categoryId = Number(body.categoryId);

    if (!name || !url) {
      return NextResponse.json({ message: "Feed name and URL are required" }, { status: 400 });
    }

    new URL(url);

    const feed = await prisma.newsFeed.create({
      data: {
        name,
        url,
        includeKeywords: includeKeywords || null,
        excludeKeywords: excludeKeywords || null,
        minRelevance,
        categoryId: Number.isInteger(categoryId) && categoryId > 0 ? categoryId : null,
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });

    return NextResponse.json(feed, { status: 201 });
  } catch (error: unknown) {
    const errorCode =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code)
        : null;

    const message =
      errorCode === "P2002"
        ? "এই RSS URL আগে থেকেই যোগ করা আছে।"
        : error instanceof Error
          ? error.message
          : "Feed save failed";

    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!allowed(session)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ message: "Invalid feed id" }, { status: 400 });
  }

  await prisma.newsFeed.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!allowed(session)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const id = Number(new URL(req.url).searchParams.get("id"));
  const body = await req.json();

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ message: "Invalid feed id" }, { status: 400 });
  }

  const data: {
    enabled?: boolean;
    includeKeywords?: string | null;
    excludeKeywords?: string | null;
    minRelevance?: number;
    categoryId?: number | null;
  } = {};

  if ("enabled" in body) data.enabled = Boolean(body.enabled);
  if ("includeKeywords" in body) {
    const value = normalizeKeywords(body.includeKeywords);
    data.includeKeywords = value || null;
  }
  if ("excludeKeywords" in body) {
    const value = normalizeKeywords(body.excludeKeywords);
    data.excludeKeywords = value || null;
  }
  if ("minRelevance" in body) {
    data.minRelevance = normalizeMinRelevance(body.minRelevance);
  }
  if ("categoryId" in body) {
    const value = Number(body.categoryId);
    data.categoryId = Number.isInteger(value) && value > 0 ? value : null;
  }

  const feed = await prisma.newsFeed.update({
    where: { id },
    data,
    include: { category: { select: { id: true, name: true, slug: true } } },
  });

  return NextResponse.json(feed);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!allowed(session)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const limited = rateLimitActor(
    req,
    session.user.email || "unknown",
    "admin-rss-test",
    30,
    60 * 60 * 1000
  );

  if (!limited.success) {
    return rateLimitResponse(limited.resetAt);
  }

  try {
    const body = await req.json();
    const id = Number(body.id);
    const feed = await prisma.newsFeed.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });

    if (!feed) return NextResponse.json({ message: "Feed not found" }, { status: 404 });

    const rawItems = await fetchRSSFeed(feed.url);
    const filtered = filterRSSItems(rawItems, feed.includeKeywords, feed.excludeKeywords);

    return NextResponse.json({
      feed,
      items: filtered.items,
      stats: {
        total: filtered.total,
        included: filtered.items.length,
        excluded: filtered.excluded,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "RSS fetch failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
