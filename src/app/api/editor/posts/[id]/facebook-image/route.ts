import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

function allowed(role?: string | null) {
  return role === "EDITOR" || role === "ADMIN";
}

export async function POST(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!allowed(session?.user?.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const facebookImage = String(body.facebookImage || "").trim();

  if (!facebookImage) {
    return NextResponse.json(
      { message: "Facebook image URL is required." },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.post.update({
      where: { id: context.params.id },
      data: {
        facebookImage,
        facebookError: null,
        facebookStatus: "READY",
      },
      select: {
        id: true,
        facebookImage: true,
        facebookStatus: true,
        facebookError: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Facebook image save failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
