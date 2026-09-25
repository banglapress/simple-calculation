// src/app/api/upload/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { securityLog } from "@/lib/security-log";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const UPLOAD_ROLES = new Set(["REPORTER", "EDITOR", "ADMIN"]);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!UPLOAD_ROLES.has(session.user.role || "")) {
    securityLog("upload_forbidden", {
      email: session.user.email,
      role: session.user.role || null,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = clientIp(req);
  const userKey = session.user.email;
  const limited = rateLimit(`upload:${userKey}:${ip}`, 30, 60 * 60 * 1000); // 30 / hour
  if (!limited.success) {
    securityLog("upload_rate_limited", { email: userKey, ip });
    return rateLimitResponse(limited.resetAt);
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Only image files are allowed (JPEG, PNG, WebP, GIF, AVIF)" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File size must be 5MB or less" },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const uploadResult: UploadApiResponse = await new Promise(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "khela-tv",
            resource_type: "image",
          },
          (error, result) => {
            if (error || !result) return reject(error);
            resolve(result);
          }
        );

        uploadStream.end(buffer);
      }
    );

    return NextResponse.json({ url: uploadResult.secure_url });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
