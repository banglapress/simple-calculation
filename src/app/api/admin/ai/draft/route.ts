import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { processOneStory } from "@/lib/desk-newsroom";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (
    !session?.user?.email ||
    !["ADMIN", "EDITOR"].includes(session.user.role || "")
  ) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const title = String(body.title || "").trim();
    const url = String(body.url || "").trim();
    const description = String(body.description || "").trim();
    const categoryId = Number(body.categoryId);
    const feedId = Number(body.feedId);

    if (!title || !url || !Number.isInteger(categoryId) || categoryId <= 0) {
      return NextResponse.json(
        { message: "Title, source URL and category are required." },
        { status: 400 }
      );
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true },
    });

    if (!category) {
      return NextResponse.json(
        { message: "Selected category was not found." },
        { status: 400 }
      );
    }

    const existingPost = await prisma.post.findFirst({
      where: { sourceUrl: url },
      select: { id: true, title: true, status: true },
    });

    if (existingPost) {
      return NextResponse.json(
        {
          message: "এই source থেকে পোস্ট আগে থেকেই আছে।",
          post: existingPost,
        },
        { status: 409 }
      );
    }

    let storySource = await prisma.deskStorySource.findFirst({
      where: { url },
      select: { storyId: true },
    });

    if (!storySource) {
      const story = await prisma.deskStory.create({
        data: {
          titleHint: title,
          categoryId,
          status: "NEW",
          sourceCount: 1,
        },
      });

      await prisma.deskStorySource.create({
        data: {
          storyId: story.id,
          feedId: Number.isInteger(feedId) && feedId > 0 ? feedId : null,
          url,
          canonicalUrl: url,
          title,
          excerpt: description || null,
          rawText: description || null,
          origin: "manual",
        },
      });

      storySource = { storyId: story.id };
    } else {
      await prisma.deskStory.update({
        where: { id: storySource.storyId },
        data: {
          categoryId,
          status: "NEW",
          updatedAt: new Date(),
        },
      });
    }

    const result = await processOneStory(storySource.storyId);

    if (result.step === "review") {
      return NextResponse.json(
        {
          message: "AI relevance check-এর পরে Editor Review দরকার।",
          ...result,
        },
        { status: 422 }
      );
    }

    if (result.step !== "draft" || !result.postId) {
      return NextResponse.json(
        { message: "AI draft তৈরি হয়নি।", ...result },
        { status: 500 }
      );
    }

    const post = await prisma.post.findUnique({
      where: { id: result.postId },
      select: { id: true, title: true, status: true },
    });

    return NextResponse.json({
      post,
      storyId: storySource.storyId,
      relevanceScore: result.relevanceScore ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI draft creation failed";

    console.error("ADMIN AI DRAFT ERROR:", error);

    return NextResponse.json(
      { message },
      { status: /not configured/i.test(message) ? 503 : 500 }
    );
  }
}
