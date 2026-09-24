import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { defaultFacebookImagePrompt } from "@/lib/cloudflare-facebook-image";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || !["EDITOR", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  const post = await prisma.post.findUnique({
    where: { id },
    include: { categories: { select: { name: true } } },
  });

  if (!post) {
    return NextResponse.json({ message: "Post not found" }, { status: 404 });
  }

  const prompt = defaultFacebookImagePrompt({
    title: post.title,
    excerpt: post.excerpt,
    category: post.categories[0]?.name,
    tags: post.tags,
  });

  await prisma.post.update({
    where: { id },
    data: {
      facebookImagePrompt: prompt,
    },
  });

  return NextResponse.json({ prompt });
}
