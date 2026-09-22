import { NextRequest, NextResponse } from "next/server";
import { runNewsroom } from "@/lib/desk-newsroom";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const secret = String(process.env.NEWSROOM_CRON_SECRET || "").trim();
  if (!secret) {
    return NextResponse.json(
      { message: "NEWSROOM_CRON_SECRET is not configured" },
      { status: 503 }
    );
  }

  const authorization = req.headers.get("authorization") || "";
  if (authorization !== "Bearer " + secret) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runNewsroom(4);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Newsroom cron failed";
    console.error("NEWSROOM CRON ERROR:", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
