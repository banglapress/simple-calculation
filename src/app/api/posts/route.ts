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

  const {
    title,
    content,
    featureImage,
    categoryIds = [],
    subcategoryIds = [],
    tags,
    status,
  } = await req.json();

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

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
        author: { connect: { id: user.id } },
        categories: {
          connect: categoryIds.map((id: number) => ({ id })),
        },
        subcategories: {
          connect: subcategoryIds.map((id: number) => ({ id })),
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
