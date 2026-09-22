import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { generateSportsArticle } from "@/lib/ai";

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

    const existing = await prisma.post.findFirst({
      where: {
        OR: [
          { title },
          { content: { contains: url } },
        ],
      },
      select: { id: true, title: true },
    });

    if (existing) {
      return NextResponse.json(
        {
          message: "এই source থেকে কাছাকাছি একটি draft/post আগে থেকেই আছে।",
          post: existing,
        },
        { status: 409 }
      );
    }

    const draft = await generateSportsArticle({
      title,
      categoryName: category.name,
      sourceText: description,
      sourceUrls: [url],
    });

    const post = await prisma.post.create({
      data: {
        title: draft.title || title,
        content: draft.body_html || "",
        excerpt: draft.excerpt || "",
        featureImage: "",
        tags: draft.tags.join(", "),
        status: "DRAFT",
        placement: "NONE",
        isBreaking: false,
        author: {
          connect: {
            email: session.user.email,
          },
        },
        categories: {
          connect: [{ id: category.id }],
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
    });

    return NextResponse.json({
      post,
      warnings: draft.warnings,
      provider: draft.provider,
      model: draft.model,
      sourceUrl: url,
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
