import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { publishPostToFacebook } from "@/lib/post-publishing";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || !["EDITOR", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const result = await publishPostToFacebook(id, { force: true });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        attempted: false,
        published: false,
        error:
          error instanceof Error
            ? error.message
            : "Facebook publish failed",
      },
      { status: 500 }
    );
  }
}
