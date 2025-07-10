// src/app/api/public/breaking/route.ts


import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const posts = await prisma.post.findMany({
    where: { isBreaking: true, status: "PUBLISHED" },
    orderBy: { updatedAt: "desc" },
    include: { categories: true, subcategories: true },
    take: 10,
  });

  return NextResponse.json(posts);
}
