import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

export async function GET() {
  const posts = await prisma.post.findMany({
    where: { isBreaking: true, status: "PUBLISHED" },
    orderBy: { updatedAt: "desc" },
    take: 10,
    select: {
      id: true,
      title: true,
      categories: { select: { slug: true } },
      subcategories: { select: { slug: true } },
    },
  });

  return NextResponse.json(posts, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
