// src/app/api/posts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { title, content, featureImage, categoryId, subcategoryId, tags, status } = await req.json();

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  try {
    const post = await prisma.post.create({
      data: {
        title,
        content,
        featureImage,
        status,
        tags,
        authorId: user.id,
        categoryId: parseInt(categoryId),
        subcategoryId: subcategoryId ? parseInt(subcategoryId) : null,
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error("POST ERROR:", error);
    return NextResponse.json({ message: "Failed to create post" }, { status: 500 });
  }
}
