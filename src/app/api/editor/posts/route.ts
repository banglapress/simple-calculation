// src/app/api/editor/posts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json(posts);
}

export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const { status } = await req.json();

  if (!id || !status) {
    return NextResponse.json({ message: "Missing ID or status" }, { status: 400 });
  }

  try {
    const updated = await prisma.post.update({
      where: { id },
      data: { status },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ message: "Failed to update" }, { status: 500 });
  }
}
