import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { probeFacebook } from "@/lib/facebook";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || !["EDITOR", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    return NextResponse.json(await probeFacebook());
  } catch (error) {
    return NextResponse.json({
      configured: false,
      error: error instanceof Error ? error.message : "Facebook probe failed",
    });
  }
}
