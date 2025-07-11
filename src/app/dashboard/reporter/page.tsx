// src/app/dashboard/reporter/page.tsx

import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

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
    <div className="min-h-screen flex">
      {/* ✅ Sidebar */}
      <aside className="w-64 bg-white border-r p-4 space-y-6 shadow-md">
        <h1 className="text-xl font-bold text-blue-700">📰 Bangla Sports</h1>
        <nav className="space-y-3">
          <Link href="/" className="block text-gray-700 hover:text-blue-600">
            🏠 হোম
          </Link>
          <Link href="/dashboard/reporter/password" className="block text-gray-700 hover:text-blue-600">
            🔑 পাসওয়ার্ড পরিবর্তন
          </Link>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="text-red-600 hover:underline text-sm">
              🚪 লগআউট করুন
            </button>
          </form>
        </nav>
      </aside>

      {/* ✅ Main content */}
      <main className="flex-1 p-6 space-y-6 bg-gray-50">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">📢 রিপোর্টার প্যানেল</h2>
          <Link href="/dashboard/reporter/new" className="text-blue-600 underline">
            ➕ নতুন পোস্ট লিখুন
          </Link>
        </div>

        <div className="bg-white p-4 rounded shadow-sm">
          <h3 className="font-bold mb-2">👤 প্রোফাইল</h3>
          <p>নাম: {user?.name || "অজানা"}</p>
          <p>ইমেইল: {user?.email}</p>
          <p>ভূমিকা: রিপোর্টার</p>
        </div>

        <div>
          <h3 className="font-bold mb-2">🗂 আপনার পোস্টসমূহ</h3>
          {posts.length === 0 ? (
            <p>আপনার কোনো পোস্ট নেই।</p>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="border rounded p-3 bg-white shadow hover:bg-gray-50 transition"
                >
                  <Link
                    href={`/dashboard/reporter/edit/${post.id}`}
                    className="block font-semibold text-lg text-blue-700"
                  >
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
      </main>
    </div>
  );
}
