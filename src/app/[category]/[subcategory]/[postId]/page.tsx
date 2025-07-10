// src/app/[category]/[subcategory]/[postId]/page.tsx

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Image from "next/image";
import { Post } from "@prisma/client";

export default async function PostPage({
  params,
}: {
  params: { category: string; subcategory: string; postId: string };
}) {
  const post = await prisma.post.findUnique({
    where: { id: params.postId },
    include: {
      author: true,
      categories: true,
      subcategories: true,
    },
  });

  if (!post || post.status !== "PUBLISHED") return notFound();

  const recent = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      categories: { some: { id: post.categories[0]?.id || 0 } },
      id: { not: post.id },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      categories: true,
      subcategories: true,
    },
  });

  const editorsPick = await prisma.post.findMany({
    where: { status: "PUBLISHED", placement: "EDITORS_PICK" },
    orderBy: { updatedAt: "desc" },
    take: 3,
    include: {
      categories: true,
      subcategories: true,
    },
  });

  const trending = await prisma.post.findMany({
    where: { status: "PUBLISHED", placement: "TRENDING" },
    orderBy: { updatedAt: "desc" },
    take: 3,
    include: {
      categories: true,
      subcategories: true,
    },
  });

  return (
    <>
      <Navbar />

      <main className="max-w-6xl mx-auto grid md:grid-cols-12 gap-6 p-4">
        {/* Main content */}
        <div className="md:col-span-8 space-y-4">
          <h1 className="text-3xl text-slate-700 font-[Cholontika] ">{post.title}</h1>
          <div className="text-sm text-gray-500">
            ✍️ {post.author?.name} •{" "}
            {new Date(post.createdAt).toLocaleString("bn-BD")}
          </div>

          {post.featureImage && (
            <Image
              src={post.featureImage}
              className="rounded w-full"
              alt={post.title}
              width={400}
              height={75}
            />
          )}

          <div
            className="prose prose-neutral max-w-none font-[NotoSerifBengali] text-xl text-neutral-700"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          <div className="mt-6 border-t pt-4 space-x-3">
            <p className="text-sm text-gray-600 mb-1">🔗 শেয়ার করুন:</p>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                process.env.NEXT_PUBLIC_SITE_URL +
                  `/${params.category}/${params.subcategory}/${post.id}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline text-sm"
            >
              Facebook
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                post.title +
                  " " +
                  process.env.NEXT_PUBLIC_SITE_URL +
                  `/${params.category}/${params.subcategory}/${post.id}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 underline text-sm"
            >
              WhatsApp
            </a>
          </div>

          <div className="text-sm mt-4 text-gray-400">
            🏷️ ট্যাগ: {post.tags}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="md:col-span-4 space-y-6">
          <Section title="⚽ আরও খবর" posts={recent} />
          <Section title="⭐ নির্বাচিত সংবাদ" posts={editorsPick} />
          <Section title="🔥 ট্রেন্ডিং" posts={trending} />
        </aside>
      </main>

      <Footer />
    </>
  );
}

function Section({
  title,
  posts,
}: {
  title: string;
  posts: (Post & {
    categories?: { slug: string }[];
    subcategories?: { slug: string }[];
  })[];
}) {
  return (
    <div>
      <h3 className="text-lg font-bold font-[NotoSerifBengali] mb-2 border-b pb-1">{title}</h3>
      <div className="space-y-2">
        {posts.map((p) => (
          <Link
            key={p.id}
            href={`/${p.categories?.[0]?.slug || "category"}/${p.subcategories?.[0]?.slug || "sub"}/${p.id}`}
            className="flex gap-2 text-sm group"
          >
            <Image
              src={p.featureImage}
              className="w-16 h-12 object-cover rounded"
              alt={p.title}
              height={75}
              width={300}
            />
            <span className="group-hover:underline">{p.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
