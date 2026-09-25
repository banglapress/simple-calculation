import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { validatePassword } from "@/lib/password";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      createdAt: true,
      _count: { select: { posts: true } },
    },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 403 });

  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = String(body.role || "REPORTER");

    if (!email || !password) {
      return NextResponse.json({ message: "Email ও password আবশ্যক।" }, { status: 400 });
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.ok) {
      return NextResponse.json({ message: passwordCheck.message }, { status: 400 });
    }

    if (!["READER", "REPORTER", "EDITOR", "ADMIN"].includes(role)) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ message: "এই email দিয়ে user আগে থেকেই আছে।" }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        name: name || null,
        email,
        password: await hash(password, 12),
        role: role as "READER" | "REPORTER" | "EDITOR" | "ADMIN",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("USER CREATE ERROR:", error);
    return NextResponse.json({ message: "User তৈরি করা যায়নি।" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 403 });

  try {
    const { id, name, email, role, password } = await req.json();
    if (!id) return NextResponse.json({ message: "User id আবশ্যক।" }, { status: 400 });

    if (id === session.user.id && role && role !== "ADMIN") {
      return NextResponse.json({ message: "নিজের ADMIN role পরিবর্তন করা যাবে না।" }, { status: 400 });
    }

    if (role && !["READER", "REPORTER", "EDITOR", "ADMIN"].includes(role)) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 });
    }

    if (password !== undefined && password !== "") {
      const passwordCheck = validatePassword(String(password));
      if (!passwordCheck.ok) {
        return NextResponse.json({ message: passwordCheck.message }, { status: 400 });
      }
    }

    const data: {
      name?: string | null;
      email?: string;
      role?: "READER" | "REPORTER" | "EDITOR" | "ADMIN";
      password?: string;
      sessionVersion?: { increment: number };
    } = {};

    if (name !== undefined) data.name = String(name).trim() || null;
    if (email !== undefined) data.email = String(email).trim().toLowerCase();
    if (role !== undefined) data.role = role;
    if (password) data.password = await hash(String(password), 12);

    if (email !== undefined || role !== undefined || password) {
      data.sessionVersion = { increment: 1 };
    }

    const user = await prisma.user.update({
      where: { id: String(id) },
      data,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("USER UPDATE ERROR:", error);
    return NextResponse.json({ message: "User update করা যায়নি।" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ message: "User id আবশ্যক।" }, { status: 400 });
  if (id === session.user.id) {
    return NextResponse.json({ message: "নিজের account মুছে ফেলা যাবে না।" }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ message: "User deleted" });
  } catch (error) {
    console.error("USER DELETE ERROR:", error);
    return NextResponse.json({ message: "User মুছে ফেলা যায়নি।" }, { status: 500 });
  }
}
