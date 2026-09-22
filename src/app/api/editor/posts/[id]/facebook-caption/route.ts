import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { buildFacebookCaption } from "@/lib/facebook";

export async function POST(
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || !["EDITOR", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const post = await prisma.post.findUnique({
    where: { id: context.params.id },
    include: { categories: { select: { slug: true } } },
  });

  if (!post) {
    return NextResponse.json({ message: "Post not found" }, { status: 404 });
  }

  const url =
    "https://www.khelatv.com/" +
    (post.categories[0]?.slug || "sports") +
    "/" +
    post.id;

  const caption = buildFacebookCaption({
    title: post.title,
    excerpt: post.excerpt,
    url,
    tags: post.tags,
  });

  await prisma.post.update({
    where: { id: post.id },
    data: {
      facebookCaption: caption,
      facebookStatus: post.status === "PUBLISHED" ? post.facebookStatus : "READY",
    },
  });

  return NextResponse.json({ caption });
}
