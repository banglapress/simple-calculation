// src/app/dashboard/reporter/page.tsx
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { signOut } from "next-auth/react";

export default async function ReporterDashboard() {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({
    where: { email: session?.user?.email || "" },
  });

  const posts = await prisma.post.findMany({
    where: { authorId: user?.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">📢 রিপোর্টার প্যানেল</h1>
        <Link href="/dashboard/reporter/new" className="text-blue-600 underline">
          ➕ নতুন পোস্ট লিখুন
        </Link>
      </div>

      <div className="border p-4 rounded bg-white shadow-sm">
        <h2 className="font-bold mb-2">👤 প্রোফাইল</h2>
        <p>নাম: {user?.name || "অজানা"}</p>
        <p>ইমেইল: {user?.email}</p>
        <p>ভূমিকা: রিপোর্টার</p>
        <form
          action="/api/auth/signout"
          method="POST"
          className="mt-3"
        >
          <button
            type="submit"
            className="text-red-600 underline text-sm"
          >
            🚪 লগআউট করুন
          </button>
        </form>
      </div>

      <div className="border p-4 rounded bg-white shadow-sm">
        <h2 className="font-bold mb-2">🔑 পাসওয়ার্ড পরিবর্তন</h2>
        <form action="/api/reporter/update-password" method="POST" className="space-y-2">
          <input
            type="password"
            name="currentPassword"
            placeholder="পুরানো পাসওয়ার্ড"
            className="w-full border p-2 rounded"
            required
          />
          <input
            type="password"
            name="newPassword"
            placeholder="নতুন পাসওয়ার্ড"
            className="w-full border p-2 rounded"
            required
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            ✅ পাসওয়ার্ড আপডেট করুন
          </button>
        </form>
      </div>

      <div>
        <h2 className="font-bold mb-2">🗂 আপনার পোস্টসমূহ</h2>
        {posts.length === 0 ? (
          <p>আপনার কোনো পোস্ট নেই।</p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="border rounded p-3 bg-white shadow hover:bg-gray-50 transition"
              >
                <Link href={`/dashboard/reporter/edit/${post.id}`} className="block font-semibold text-lg text-blue-700">
                  {post.title}
                </Link>
                <p className="text-sm text-gray-500">
                  ✍️ {new Date(post.createdAt).toLocaleString("bn-BD")} • স্ট্যাটাস:{" "}
                  <span
                    className={`font-medium ${
                      post.status === "DRAFT"
                        ? "text-gray-500"
                        : post.status === "PENDING"
                        ? "text-orange-500"
                        : "text-green-600"
                    }`}
                  >
                    {post.status === "DRAFT"
                      ? "খসড়া"
                      : post.status === "PENDING"
                      ? "সম্পাদকের অনুমতির অপেক্ষায়"
                      : "প্রকাশিত"}
                  </span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
