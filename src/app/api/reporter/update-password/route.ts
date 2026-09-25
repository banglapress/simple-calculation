// src/app/api/reporter/update-password/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { compare, hash } from "bcryptjs";
import { validatePassword } from "@/lib/password";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const limited = rateLimit(
    "password-change:" + clientIp(req) + ":" + session.user.email,
    5,
    15 * 60 * 1000
  );

  if (!limited.success) {
    return rateLimitResponse(limited.resetAt);
  }

  const formData = await req.formData();
  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ message: "Invalid input" }, { status: 400 });
  }

  const passwordCheck = validatePassword(newPassword);
  if (!passwordCheck.ok) {
    return NextResponse.json(
      { message: passwordCheck.message },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user || !user.password) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const isMatch = await compare(currentPassword, user.password);
  if (!isMatch) {
    return NextResponse.json(
      { message: "পুরানো পাসওয়ার্ড ভুল" },
      { status: 403 }
    );
  }

  const hashed = await hash(newPassword, 12);

  await prisma.user.update({
    where: { email: user.email },
    data: {
      password: hashed,
      sessionVersion: { increment: 1 },
    },
  });

  return NextResponse.redirect(`${req.nextUrl.origin}/dashboard/reporter`);
}
