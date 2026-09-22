import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { fetchRSSFeed } from "@/lib/rss";

type AuthSession = {
  user?: {
    role?: string | null;
  };
} | null;

function allowed(session: AuthSession) {
  return (
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "EDITOR"
  );
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!allowed(session)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const feeds = await prisma.newsFeed.findMany({
    orderBy: { id: "asc" },
  });

  return NextResponse.json(feeds);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!allowed(session)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const url = String(body.url || "").trim();

    if (!name || !url) {
      return NextResponse.json(
        { message: "Feed name and URL are required" },
        { status: 400 }
      );
    }

    new URL(url);

    const feed = await prisma.newsFeed.create({
      data: { name, url },
    });

    return NextResponse.json(feed, { status: 201 });
  } catch (error: unknown) {
    const errorCode =
      typeof error === "object" &&
      error !== null &&
      "code" in error
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
  if (!allowed(session)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const id = Number(new URL(req.url).searchParams.get("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ message: "Invalid feed id" }, { status: 400 });
  }

  await prisma.newsFeed.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!allowed(session)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const id = Number(new URL(req.url).searchParams.get("id"));
  const body = await req.json();

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ message: "Invalid feed id" }, { status: 400 });
  }

  const enabled = Boolean(body.enabled);

  const feed = await prisma.newsFeed.update({
    where: { id },
    data: { enabled },
  });

  return NextResponse.json(feed);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!allowed(session)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const id = Number(body.id);

    const feed = await prisma.newsFeed.findUnique({ where: { id } });
    if (!feed) {
      return NextResponse.json({ message: "Feed not found" }, { status: 404 });
    }

    const items = await fetchRSSFeed(feed.url);

    return NextResponse.json({
      feed: {
        id: feed.id,
        name: feed.name,
        url: feed.url,
      },
      items,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "RSS fetch failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
