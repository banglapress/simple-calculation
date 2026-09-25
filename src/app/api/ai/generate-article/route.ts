import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { rateLimitActor, rateLimitResponse } from "@/lib/rate-limit";
import { generateSportsArticle } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!["REPORTER", "EDITOR", "ADMIN"].includes(session.user.role || "")) {
    return NextResponse.json(
      { message: "AI newsroom access denied" },
      { status: 403 }
    );
  }

  const limited = rateLimitActor(
    req,
    session.user.email,
    "ai-article",
    10,
    60 * 60 * 1000
  );

  if (!limited.success) {
    return rateLimitResponse(limited.resetAt);
  }

  try {
    const body = await req.json();

    const result = await generateSportsArticle({
      title: typeof body.title === "string" ? body.title : "",
      categoryName:
        typeof body.categoryName === "string" ? body.categoryName : "Sports",
      sourceText:
        typeof body.sourceText === "string" ? body.sourceText : "",
      sourceUrls: Array.isArray(body.sourceUrls)
        ? body.sourceUrls.filter((value: unknown): value is string => typeof value === "string")
        : [],
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI generation failed";

    console.error("AI DRAFT ERROR:", error);

    return NextResponse.json(
      { message },
      { status: /not configured/i.test(message) ? 503 : 500 }
    );
  }
}
