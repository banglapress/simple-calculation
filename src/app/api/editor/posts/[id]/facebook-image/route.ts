import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { rateLimitActor, rateLimitResponse } from "@/lib/rate-limit";
import {
  cloudflareFacebookImageConfigured,
  defaultFacebookImagePrompt,
  generateAndStoreFacebookImage,
} from "@/lib/cloudflare-facebook-image";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || !["EDITOR", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const limited = rateLimitActor(
    req,
    session.user.email ?? "unknown",
    "facebook-ai-image",
    12,
    60 * 60 * 1000
  );

  if (!limited.success) {
    return rateLimitResponse(limited.resetAt);
  }

  if (!cloudflareFacebookImageConfigured()) {
    return NextResponse.json(
      {
        message:
          "Cloudflare AI image generation is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.",
      },
      { status: 503 }
    );
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      categories: { select: { name: true } },
    },
  });

  if (!post) {
    return NextResponse.json({ message: "Post not found" }, { status: 404 });
  }

  const prompt =
    typeof body.prompt === "string" && body.prompt.trim().length >= 30
      ? body.prompt.trim().slice(0, 4000)
      : defaultFacebookImagePrompt({
          title: post.title,
          excerpt: post.excerpt,
          category: post.categories[0]?.name,
          tags: post.tags,
        });

  try {
    const generated = await generateAndStoreFacebookImage({ prompt });

    const updated = await prisma.post.update({
      where: { id },
      data: {
        facebookImageUrl: null,
        facebookImagePrompt: prompt,
        facebookStatus: "NONE",
        facebookError: null,
      },
      select: {
        id: true,
        facebookImageUrl: true,
        facebookImagePrompt: true,
        facebookStatus: true,
      },
    });

    return NextResponse.json({
      ...generated,
      prompt,
      post: updated,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Facebook AI image generation failed";

    await prisma.post.update({
      where: { id },
      data: {
        facebookImagePrompt: prompt,
        facebookStatus: "FAILED",
        facebookError: message,
      },
    });

    return NextResponse.json(
      {
        message,
        prompt,
      },
      { status: 500 }
    );
  }
}
