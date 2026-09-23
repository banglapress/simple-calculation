export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { publishPostToFacebook } from "@/lib/post-publishing";

function allowed(role?: string | null) {
  return role === "EDITOR" || role === "ADMIN";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!allowed(session?.user?.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { name: true, email: true } },
      categories: { select: { name: true, slug: true } },
      deskStory: {
        select: {
          id: true,
          titleHint: true,
          status: true,
          sourceCount: true,
          relevanceScore: true,
          relevanceReason: true,
          warning: true,
          sources: {
            select: {
              title: true,
              url: true,
              feed: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json(posts, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!allowed(session?.user?.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const body = await req.json();
  const status = String(body.status || "");

  if (!id || !["DRAFT", "PENDING", "PUBLISHED"].includes(status)) {
    return NextResponse.json(
      { message: "Missing ID or invalid status" },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.post.update({
      where: { id },
      data: { status: status as "DRAFT" | "PENDING" | "PUBLISHED" },
    });

    const facebook =
      status === "PUBLISHED" ? await publishPostToFacebook(id) : null;

    const final = await prisma.post.findUnique({ where: { id } });

    return NextResponse.json({
      post: final || updated,
      facebook,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update";
    return NextResponse.json({ message }, { status: 500 });
  }
}
