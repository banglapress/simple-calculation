// app/api/category/[slug]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const { slug } = params;

  const posts = await prisma.post.findMany({
    where: { 
      status: "PUBLISHED",
      categories: { some: { slug } }
    },
    orderBy: { updatedAt: "desc" },
    take: 4,
    select: {
      id: true,
      title: true,
      featureImage: true,
      content: true,
      categories: { select: { slug: true } },
      subcategories: { select: { slug: true } }
    }
  });

  return NextResponse.json(posts);
}
