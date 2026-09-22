import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  getPlacementSidebarPosts,
  getPublicPostById,
  getPublicSubcategoryBySlug,
  getPublicSubcategoryPosts,
  getRelatedPosts,
} from "@/lib/public-data";

export const revalidate = 60;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.khelatv.com";

export async function generateStaticParams() {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      categories: { select: { slug: true } },
      subcategories: { select: { slug: true } },
    },
  });

  return posts.flatMap((post) => {
    const category = post.categories[0]?.slug;
    if (!category) return [];

    const subcategory = post.subcategories[0]?.slug;

    return [
      {
        category,
        slug: subcategory ? [subcategory, post.id] : [post.id],
      },
    ];
  });
}

export async function generateMetadata({
  params,
}: {
  params: { category: string; slug: string[] };
}): Promise<Metadata> {
  const categorySlug = params.category;
  const segments = params.slug || [];

  if (segments.length === 1) {
    const post = await getPublicPostById(segments[0]);

    if (post?.status === "PUBLISHED") {
      return buildPostMetadata(post, categorySlug);
    }

    const subcategory = await getPublicSubcategoryBySlug(
      categorySlug,
      segments[0]
    );

    if (!subcategory) return {};

    return {
      title: subcategory.name,
      description:
        subcategory.name +
        " — " +
        subcategory.category.name +
        " বিভাগের সর্বশেষ খবর",
      alternates: {
        canonical:
          SITE_URL +
          "/" +
          subcategory.category.slug +
          "/" +
          subcategory.slug,
      },
    };
  }

  if (segments.length === 2) {
    const post = await getPublicPostById(segments[1]);

    if (post?.status === "PUBLISHED") {
      return buildPostMetadata(post, categorySlug);
    }
  }

  return {};
}

export default async function CategoryDepthPage({
  params,
}: {
  params: { category: string; slug: string[] };
}) {
  const categorySlug = params.category;
  const segments = params.slug || [];

  if (segments.length === 1) {
    const post = await getPublicPostById(segments[0]);

    if (post?.status === "PUBLISHED") {
      return <PostPage post={post} />;
    }

    const subcategorySlug = segments[0];
    const subcategory = await getPublicSubcategoryBySlug(
      categorySlug,
      subcategorySlug
    );

    if (!subcategory) return notFound();

    const posts = await getPublicSubcategoryPosts(
      categorySlug,
      subcategorySlug
    );

    return (
      <>
        <Navbar />
        <main className="max-w-7xl mx-auto p-4 space-y-6">
          <div>
            <div className="text-sm text-gray-500 mb-1">
              <Link href={"/" + subcategory.category.slug}>
                {subcategory.category.name}
              </Link>
              <span className="mx-2">/</span>
              <span>{subcategory.name}</span>
            </div>
            <h1 className="text-3xl font-bold font-[NotoSerifBengali]">
              {subcategory.name}
            </h1>
          </div>

          {posts.length === 0 ? (
            <div className="rounded-xl border bg-white p-8 text-gray-500">
              এই সাবক্যাটাগরিতে এখনো কোনো প্রকাশিত সংবাদ নেই।
            </div>
          ) : (
            <PostGrid posts={posts} />
          )}
        </main>
        <Footer />
      </>
    );
  }

  if (segments.length === 2) {
    const post = await getPublicPostById(segments[1]);

    if (post?.status === "PUBLISHED") {
      return <PostPage post={post} />;
    }
  }

  return notFound();
}

type PublicPost = Awaited<ReturnType<typeof getPublicPostById>>;

async function PostPage({ post }: { post: NonNullable<PublicPost> }) {
  const categoryId = post.categories[0]?.id || 0;
  const categorySlug = post.categories[0]?.slug || "category";
  const subcategorySlug = post.subcategories[0]?.slug || null;
  const fullUrl =
    SITE_URL +
    "/" +
    categorySlug +
    (subcategorySlug ? "/" + subcategorySlug : "") +
    "/" +
    post.id;

  const [recent, placementPosts] = await Promise.all([
    getRelatedPosts(categoryId, post.id),
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
            ✍️ {post.author?.name} •{" "}
            {new Date(post.createdAt).toLocaleString("bn-BD")}
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
              href={
                "https://www.facebook.com/sharer/sharer.php?u=" +
                encodeURIComponent(fullUrl)
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline text-sm"
            >
              Facebook
            </a>
            <a
              href={
                "https://wa.me/?text=" +
                encodeURIComponent(post.title + " " + fullUrl)
              }
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

function PostGrid({
  posts,
}: {
  posts: Array<{
    id: string;
    title: string;
    featureImage: string;
    categories: { slug: string; name: string }[];
    subcategories: { slug: string; name: string }[];
  }>;
}) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {posts.map((post) => {
        const categorySlug = post.categories[0]?.slug || "category";
        const subcategorySlug = post.subcategories[0]?.slug;
        const href =
          "/" +
          categorySlug +
          (subcategorySlug ? "/" + subcategorySlug : "") +
          "/" +
          post.id;

        return (
          <Link
            href={href}
            key={post.id}
            className="group rounded-xl border bg-white overflow-hidden shadow-sm hover:shadow-md transition"
          >
            {post.featureImage ? (
              <Image
                src={post.featureImage}
                alt={post.title}
                width={900}
                height={506}
                className="w-full aspect-video object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            ) : (
              <div className="w-full aspect-video bg-gray-100" />
            )}
            <div className="p-4">
              <h2 className="font-[NotoSerifBengali] text-lg leading-7 group-hover:text-red-600">
                {post.title}
              </h2>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function buildPostMetadata(
  post: NonNullable<PublicPost>,
  fallbackCategorySlug: string
): Metadata {
  const categorySlug = post.categories[0]?.slug || fallbackCategorySlug;
  const subcategorySlug = post.subcategories[0]?.slug;
  const fullUrl =
    SITE_URL +
    "/" +
    categorySlug +
    (subcategorySlug ? "/" + subcategorySlug : "") +
    "/" +
    post.id;

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
          const href =
            "/" + cat + (sub ? "/" + sub : "") + "/" + p.id;

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
