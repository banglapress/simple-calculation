// src/app/api/admin/reporters/route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const reporters = await prisma.user.findMany({
    where: { role: "REPORTER" },
    select: { id: true, name: true },
  });

  return NextResponse.json(reporters);
}
