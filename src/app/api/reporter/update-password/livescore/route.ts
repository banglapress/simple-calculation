

// src/app/api/reporter/livescore/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "REPORTER") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  const data = await req.json();

  try {
    const score = await prisma.liveScore.upsert({
      where: { id: "default" }, // Assume only one live match at a time
      update: data,
      create: { ...data, id: "default" },
    });

    return NextResponse.json(score);
  } catch (error) {
    console.error("LiveScore Error:", error);
    return NextResponse.json({ message: "Failed to update score" }, { status: 500 });
  }
}
