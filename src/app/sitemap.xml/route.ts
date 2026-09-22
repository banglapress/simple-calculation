import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const revalidate = 3600;

export async function GET() {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      updatedAt: true,
      categories: { select: { slug: true } },
      subcategories: { select: { slug: true } },
    },
  });

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.khelatv.com";

  const urls = posts.map((post) => {
    const cat = post.categories[0]?.slug;
    const sub = post.subcategories[0]?.slug;
    const path = sub
      ? `/${cat}/${sub}/${post.id}`
      : `/${cat}/${post.id}`;

    return `
  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${post.updatedAt.toISOString()}</lastmod>
  </url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>
  ${urls.join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
