// src/app/api/public/livescore/route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const score = await prisma.liveScore.findUnique({
    where: { id: "default" },
  });

  return NextResponse.json(score);
}
