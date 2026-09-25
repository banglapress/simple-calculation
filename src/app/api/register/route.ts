import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { validatePassword } from "@/lib/password";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    const limited = rateLimit(`register:${ip}`, 5, 15 * 60 * 1000); // 5 / 15 min
    if (!limited.success) {
      return rateLimitResponse(limited.resetAt);
    }

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim() || null;
    const password = String(body.password || "");

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { message: "সঠিক ইমেইল ঠিকানা দিন।" },
        { status: 400 }
      );
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.ok) {
      return NextResponse.json(
        { message: passwordCheck.message },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { message: "এই ইমেইল ইতিমধ্যেই ব্যবহৃত হয়েছে।" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: "READER",
      },
    });

    return NextResponse.json(
      { message: "User registered successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
