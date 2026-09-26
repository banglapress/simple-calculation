import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { v2 as cloudinary } from "cloudinary";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { rateLimitActor, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

function allowed(role?: string | null) {
  return role === "EDITOR" || role === "ADMIN";
}

function buildSearchExpression(query: string, folderField: "folder" | "asset_folder") {
  const term = query.trim();
  return (
    "resource_type:image AND " +
    folderField +
    (folderField === "asset_folder" ? ":khela-tv" : ":khela-tv") +
    (term ? " AND " + JSON.stringify(term) : "")
  );
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!allowed(session?.user?.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const limited = rateLimitActor(
    req,
    session.user.email ?? "unknown",
    "cloudinary-gallery",
    60,
    60 * 1000
  );

  if (!limited.success) {
    return rateLimitResponse(limited.resetAt);
  }

  const { searchParams } = new URL(req.url);
  const query = String(searchParams.get("q") || "").trim().slice(0, 120);
  const cursor = String(searchParams.get("cursor") || "").trim();
  const parsedLimit = Number(searchParams.get("limit") || 48);
  const limit = Number.isInteger(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 12), 48)
    : 48;

  const expressions = [
    buildSearchExpression(query, "folder"),
    buildSearchExpression(query, "asset_folder"),
  ];

  let result:
    | {
        resources?: Array<{
          asset_id?: string;
          public_id?: string;
          secure_url?: string;
          width?: number;
          height?: number;
          bytes?: number;
          format?: string;
          created_at?: string;
        }>;
        next_cursor?: string;
        total_count?: number;
      }
    | null = null;
  let lastError: unknown = null;

  for (const expression of expressions) {
    try {
      let search = cloudinary.search
        .expression(expression)
        .sort_by("created_at", "desc")
        .max_results(limit);

      if (cursor) {
        search = search.next_cursor(cursor);
      }

      result = await search.execute();
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!result) {
    console.error("Cloudinary gallery search error:", lastError);
    return NextResponse.json(
      { message: "Cloudinary Gallery লোড করা যায়নি" },
      { status: 500 }
    );
  }

  const resources = (result.resources || [])
    .map((resource) => ({
      id: String(resource.asset_id || resource.public_id || resource.secure_url || ""),
      url: String(resource.secure_url || "").trim(),
      publicId: String(resource.public_id || "").trim(),
      width: Number(resource.width || 0),
      height: Number(resource.height || 0),
      bytes: Number(resource.bytes || 0),
      format: String(resource.format || "").trim(),
      createdAt: String(resource.created_at || "").trim(),
    }))
    .filter((resource) => resource.url);

  return NextResponse.json({
    assets: resources,
    nextCursor: result.next_cursor || null,
    totalCount: Number(result.total_count || resources.length),
  });
}
