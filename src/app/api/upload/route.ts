import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export async function POST(req: NextRequest) {
  const data = await req.formData();
  const file = data.get("file") as File;

  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Create folder structure: /public/uploads/yyyy/mm/dd/
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const folderPath = path.join(process.cwd(), "public", "uploads", year.toString(), month, day);

  await fs.mkdir(folderPath, { recursive: true });

  const uniqueName = `img-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;
  const filePath = path.join(folderPath, uniqueName);

  await fs.writeFile(filePath, buffer);

  const fileUrl = `/uploads/${year}/${month}/${day}/${uniqueName}`;

  return NextResponse.json({ url: fileUrl });
}
