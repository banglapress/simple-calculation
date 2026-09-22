import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ingestFeed, processDeskQueue } from "@/lib/desk-newsroom";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !["ADMIN", "EDITOR"].includes(session.user.role || "")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(8, Math.max(1, Number(body.limit) || 4));
    const feedIdValue = Number(body.feedId);
    const feedId =
      Number.isInteger(feedIdValue) && feedIdValue > 0 ? feedIdValue : undefined;

    const ingest = await ingestFeed(feedId);
    const processed = await processDeskQueue(limit);

    return NextResponse.json({
      ingest,
      processed,
      draftCount: processed.filter((row) => row.step === "draft").length,
      reviewCount: processed.filter((row) => row.step === "review").length,
      errorCount: processed.filter((row) => row.step === "error").length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Newsroom run failed";
    console.error("NEWSROOM RUN ERROR:", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
