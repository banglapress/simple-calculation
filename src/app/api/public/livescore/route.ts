import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const revalidate = 15;

export async function GET() {
  const score = await prisma.liveScore.findUnique({
    where: { id: "default" },
  });

  return NextResponse.json(score, {
    headers: {
      "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
    },
  });
}
