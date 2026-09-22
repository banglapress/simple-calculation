import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { publishPostToFacebook } from "@/lib/post-publishing";

function allowed(role?: string | null) {
  return role === "EDITOR" || role === "ADMIN";
}

export async function POST(
  req: NextRequest,
  context: { params: { id: string } }
) {
  void req;
  const session = await getServerSession(authOptions);
  if (!allowed(session?.user?.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id: context.params.id },
      select: { id: true, status: true, facebookImage: true },
    });

    if (!post) {
      return NextResponse.json({ message: "Post not found" }, { status: 404 });
    }

    if (!post.facebookImage) {
      return NextResponse.json(
        { message: "Facebook photo card আগে তৈরি করুন।" },
        { status: 400 }
      );
    }

    const result = await publishPostToFacebook(post.id, { force: true });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Facebook publish failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
