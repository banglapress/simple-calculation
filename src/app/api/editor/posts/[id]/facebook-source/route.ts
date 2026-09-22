import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
});

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
      select: { id: true, featureImage: true },
    });

    if (!post) {
      return NextResponse.json({ message: "Post not found" }, { status: 404 });
    }

    const source = String(post.featureImage || "").trim();
    if (!source) {
      return NextResponse.json(
        { message: "আগে Feature Image যোগ করুন।" },
        { status: 400 }
      );
    }

    if (source.includes("res.cloudinary.com/")) {
      return NextResponse.json({ featureImage: source });
    }

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return NextResponse.json(
        { message: "Cloudinary is not configured." },
        { status: 500 }
      );
    }

    const uploaded = await cloudinary.uploader.upload(source, {
      folder: "khela-tv/ai-source-images",
      resource_type: "image",
    });

    await prisma.post.update({
      where: { id: post.id },
      data: { featureImage: uploaded.secure_url },
    });

    return NextResponse.json({ featureImage: uploaded.secure_url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Feature image prepare failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
