import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  getPlacementSidebarPosts,
  getPublicPostById,
} from "@/lib/public-data";

export const revalidate = 60;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.khelatv.com";

export async function generateMetadata({
  params,
}: {
  params: { category: string; slug: string[] };
}): Promise<Metadata> {
  const postId = params.slug.at(-1);
  if (!postId) return {};

  const post = await getPublicPostById(postId);

  if (!post || post.status !== "PUBLISHED") return {};

  const categorySlug = post.categories?.[0]?.slug || "category";
  const subcategorySlug = post.subcategories?.[0]?.slug;
  const fullUrl = `${SITE_URL}/${categorySlug}${
    subcategorySlug ? `/${subcategorySlug}` : ""
  }/${post.id}`;

  const plainText = post.content
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ");
  const shortDescription = plainText.slice(0, 160).trim();

  return {
    title: post.title,
    description: shortDescription || post.title,
    openGraph: {
      title: post.title,
      description: shortDescription || post.title,
      type: "article",
      url: fullUrl,
      images: [
        {
          url: post.featureImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: shortDescription || post.title,
      images: [post.featureImage],
    },
    alternates: { canonical: fullUrl },
  };
}

export default async function PostPage({
  params,
}: {
  params: { category: string; slug: string[] };
}) {
  const postId = params.slug.at(-1);
  if (!postId) return notFound();

  const post = await getPublicPostById(postId);

  if (!post || post.status !== "PUBLISHED") return notFound();

  const categoryId = post.categories[0]?.id || 0;
  const categorySlug = post.categories[0]?.slug || "category";
  const subcategorySlug = post.subcategories[0]?.slug || null;
  const fullUrl = `${SITE_URL}/${categorySlug}${
    subcategorySlug ? `/${subcategorySlug}` : ""
  }/${post.id}`;

  const [recent, placementPosts] = await Promise.all([
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        categories: { some: { id: categoryId } },
        id: { not: post.id },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        featureImage: true,
        categories: { select: { slug: true } },
        subcategories: { select: { slug: true } },
      },
    }),
    getPlacementSidebarPosts(),
  ]);

  const editorsPick = placementPosts
    .filter((item) => item.placement === "EDITORS_PICK")
    .slice(0, 6);

  const trending = placementPosts
    .filter((item) => item.placement === "TRENDING")
    .slice(0, 6);

  return (
    <>
      <Navbar />

      <main className="max-w-7xl mx-auto grid md:grid-cols-12 gap-6 p-4">
        <div className="md:col-span-8 space-y-4">
          <h1 className="text-3xl text-slate-700 font-[Cholontika]">
            {post.title}
          </h1>

          <div className="text-sm text-gray-500">
            ✍️ {post.author?.name} • {new Date(post.createdAt).toLocaleString("bn-BD")}
          </div>

          {post.featureImage && (
            <Image
              src={post.featureImage}
              className="rounded w-full"
              width={1200}
              height={600}
              sizes="(max-width: 768px) 100vw, 66vw"
              alt={post.title}
              priority
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
                fullUrl
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline text-sm"
            >
              Facebook
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                post.title + " " + fullUrl
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 underline text-sm"
            >
              WhatsApp
            </a>
          </div>

          <div className="text-sm mt-4 text-gray-400">🏷️ ট্যাগ: {post.tags}</div>
        </div>

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

interface SidebarPost {
  id: string;
  title: string;
  featureImage: string;
  categories: { slug: string }[];
  subcategories: { slug: string }[];
}

function Section({ title, posts }: { title: string; posts: SidebarPost[] }) {
  return (
    <div>
      <h3 className="text-lg font-bold font-[NotoSerifBengali] mb-2 border-b pb-1">
        {title}
      </h3>
      <div className="space-y-2">
        {posts.map((p) => {
          const cat = p.categories?.[0]?.slug || "category";
          const sub = p.subcategories?.[0]?.slug;
          const href = `/${cat}${sub ? `/${sub}` : ""}/${p.id}`;

          return (
            <Link key={p.id} href={href} className="flex gap-2 text-sm group">
              <Image
                src={p.featureImage}
                className="w-16 h-12 object-cover rounded"
                alt={p.title}
                height={75}
                width={120}
                sizes="64px"
              />
              <span className="group-hover:underline">{p.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
