import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

function allowed(session: { user?: { role?: string | null } | null } | null) {
  return session?.user?.role === "ADMIN" || session?.user?.role === "EDITOR";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!allowed(session)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const stories = await prisma.deskStory.findMany({
    orderBy: { updatedAt: "desc" },
    take: 80,
    select: {
      id: true,
      titleHint: true,
      status: true,
      sourceCount: true,
      relevanceScore: true,
      relevanceReason: true,
      researchStatus: true,
      articleStatus: true,
      articleWarnings: true,
      warning: true,
      lastError: true,
      categoryId: true,
      updatedAt: true,
      category: { select: { id: true, name: true, slug: true } },
      post: { select: { id: true, title: true, status: true, facebookStatus: true } },
      sources: {
        orderBy: { createdAt: "asc" },
        take: 6,
        include: { feed: { select: { name: true } } },
      },
    },
  });
      post: { select: { id: true, title: true, status: true, facebookStatus: true } },
      sources: {
        orderBy: { createdAt: "asc" },
        take: 6,
        include: { feed: { select: { name: true } } },
      },
    },
  });

  return NextResponse.json(stories);
}
