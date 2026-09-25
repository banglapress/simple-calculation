import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { rateLimitActor, rateLimitResponse } from "@/lib/rate-limit";
import { processOneStory } from "@/lib/desk-newsroom";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !["ADMIN", "EDITOR"].includes(session.user.role || "")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const limited = rateLimitActor(
    req,
    session.user.email,
    "admin-ai-story-run",
    12,
    60 * 60 * 1000
  );

  if (!limited.success) {
    return rateLimitResponse(limited.resetAt);
  }

  const { id } = await context.params;

  try {
    const result = await processOneStory(id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Story processing failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
