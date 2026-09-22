// src/app/dashboard/reporter/page.tsx

import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export default async function ReporterDashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return <div className="p-6 text-red-600">আপনি লগইন করেননি।</div>;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    return <div className="p-6 text-red-600">রিপোর্টার তথ্য পাওয়া যায়নি।</div>;
  }

  const posts = await prisma.post.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: "desc" },
    take: 15,
    select: {
      id: true,
      title: true,
      status: true,
      placement: true,
      isBreaking: true,
      createdAt: true,
      categories: {
        select: { name: true, slug: true },
      },
      subcategories: {
        select: { name: true, slug: true },
      },
    },
  });

  const draftCount = posts.filter((post) => post.status === "DRAFT").length;
  const pendingCount = posts.filter((post) => post.status === "PENDING").length;
  const publishedCount = posts.filter((post) => post.status === "PUBLISHED").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <p className="text-sm text-gray-500">রিপোর্টার ড্যাশবোর্ড</p>
          <h1 className="text-2xl font-bold">
            স্বাগতম, {user.name || "রিপোর্টার"}
          </h1>
        </div>

        <Link
          href="/dashboard/reporter/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          ➕ নতুন পোস্ট লিখুন
        </Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="খসড়া" value={draftCount} />
        <StatCard label="সম্পাদকের অপেক্ষায়" value={pendingCount} />
        <StatCard label="প্রকাশিত" value={publishedCount} />
      </div>

      <div className="bg-white border rounded-xl p-5">
        <h2 className="font-bold mb-2">ক্যাটাগরি ও পজিশন কীভাবে সেট করবেন?</h2>
        <p className="text-sm text-gray-600">
          নতুন পোস্টে আগে মূল ক্যাটাগরি, তারপর সাবক্যাটাগরি নির্বাচন করুন।
          এরপর হোমপেইজ পজিশন থেকে Lead, Second Lead, Editor&apos;s Pick বা
          Trending নির্বাচন করতে পারবেন। AI draft তৈরি করলেও এগুলো হাতে ঠিক
          করা যাবে।
        </p>
      </div>

      <div className="bg-white border rounded-xl p-5">
        <div className="flex justify-between items-center gap-3 mb-4">
          <h2 className="font-bold">🗂 আপনার সাম্প্রতিক পোস্ট</h2>
          <span className="text-xs text-gray-500">সর্বশেষ {posts.length}টি</span>
        </div>

        {posts.length === 0 ? (
          <p className="text-gray-500">আপনার কোনো পোস্ট নেই।</p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition"
              >
                <Link
                  href={"/dashboard/reporter/edit/" + post.id}
                  className="block font-semibold text-lg text-blue-700 hover:underline"
                >
                  {post.title}
                </Link>

                <div className="flex flex-wrap gap-2 mt-2 text-xs">
                  {post.categories.map((category) => (
                    <span
                      key={category.slug}
                      className="bg-gray-100 px-2 py-1 rounded-full"
                    >
                      {category.name}
                    </span>
                  ))}

                  {post.subcategories.map((subcategory) => (
                    <span
                      key={subcategory.slug}
                      className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full"
                    >
                      {subcategory.name}
                    </span>
                  ))}

                  <PlacementLabel placement={post.placement} />

                  {post.isBreaking && (
                    <span className="bg-red-50 text-red-700 px-2 py-1 rounded-full">
                      🛑 ব্রেকিং
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-500 mt-2">
                  {new Date(post.createdAt).toLocaleString("bn-BD")} ·{" "}
                  <StatusLabel status={post.status} />
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border rounded-xl p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}

function PlacementLabel({
  placement,
}: {
  placement:
    | "NONE"
    | "LEAD"
    | "SECOND_LEAD"
    | "EDITORS_PICK"
    | "TRENDING";
}) {
  const labels = {
    NONE: "⚪ সাধারণ",
    LEAD: "🔴 Lead",
    SECOND_LEAD: "🟠 Second Lead",
    EDITORS_PICK: "⭐ Editor's Pick",
    TRENDING: "🔥 Trending",
  } as const;

  return (
    <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-full">
      {labels[placement]}
    </span>
  );
}

function StatusLabel({
  status,
}: {
  status: "DRAFT" | "PENDING" | "PUBLISHED";
}) {
  const label =
    status === "DRAFT"
      ? "খসড়া"
      : status === "PENDING"
      ? "সম্পাদকের অনুমতির অপেক্ষায়"
      : "প্রকাশিত";

  const className =
    status === "DRAFT"
      ? "text-gray-600"
      : status === "PENDING"
      ? "text-orange-600"
      : "text-green-600";

  return <span className={className}>{label}</span>;
}
