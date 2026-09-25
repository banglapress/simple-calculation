import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { validatePassword } from "@/lib/password";
import { securityLog } from "@/lib/security-log";
import { stripHtml } from "@/lib/input";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    const limited = rateLimit(`register:${ip}`, 5, 15 * 60 * 1000); // 5 / 15 min
    if (!limited.success) {
      securityLog("register_rate_limited", { ip });
      return rateLimitResponse(limited.resetAt);
    }

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const rawName = typeof body.name === "string" ? stripHtml(body.name) : "";
    const name = rawName.slice(0, 100) || null;
    const password = String(body.password || "");

    if (!email || !EMAIL_REGEX.test(email) || email.length > 254) {
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
