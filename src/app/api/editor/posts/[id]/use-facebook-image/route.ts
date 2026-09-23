import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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
    select: {
      id: true,
      status: true,
      facebookImageUrl: true,
      featureImage: true,
      facebookStatus: true,
    },
  });

  if (!post) {
    return NextResponse.json({ message: "Post not found" }, { status: 404 });
  }

  const imageUrl = String(post.facebookImageUrl || "").trim();

  if (!imageUrl) {
    return NextResponse.json(
      { message: "আগে AI image তৈরি করতে হবে।" },
      { status: 400 }
    );
  }

  const updated = await prisma.post.update({
    where: { id },
    data: {
      featureImage: imageUrl,
      facebookStatus: "READY",
      facebookError: null,
    },
    select: {
      id: true,
      featureImage: true,
      facebookImageUrl: true,
      facebookStatus: true,
      facebookError: true,
    },
  });

  return NextResponse.json({ ok: true, post: updated });
}
