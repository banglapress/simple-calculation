import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { generateFacebookCard } from "@/lib/facebook-card";

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
      include: {
        categories: { select: { name: true } },
      },
    });

    if (!post) {
      return NextResponse.json({ message: "Post not found" }, { status: 404 });
    }

    if (!post.featureImage?.trim()) {
      return NextResponse.json(
        { message: "আগে Feature Image যোগ করুন।" },
        { status: 400 }
      );
    }

    const facebookImage = await generateFacebookCard({
      title: post.title,
      category: post.categories[0]?.name || "খেলা",
      featureImage: post.featureImage,
    });

    const updated = await prisma.post.update({
      where: { id: post.id },
      data: {
        facebookImage,
        facebookError: null,
        facebookStatus: post.facebookStatus === "PUBLISHED" ? "PUBLISHED" : "READY",
      },
      select: {
        id: true,
        facebookImage: true,
        facebookStatus: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Facebook photo card তৈরি করা যায়নি";

    await prisma.post.update({
      where: { id: context.params.id },
      data: { facebookError: message, facebookStatus: "FAILED" },
    }).catch(() => undefined);

    return NextResponse.json({ message }, { status: 500 });
  }
}
