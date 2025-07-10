// src/app/[category]/[subcategory]/[postId]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Image from "next/image";
import { Prisma } from "@prisma/client";

// Use Prisma's generated type for the post with relations
type PostWithRelations = Prisma.PostGetPayload<{
  include: {
    author: true;
    categories: true;
    subcategories: true;
  };
}>;

// Our transformed post type with string dates
type Post = Omit<PostWithRelations, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

const transformPost = (post: PostWithRelations): Post => ({
  ...post,
  createdAt: post.createdAt.toISOString(),
  updatedAt: post.updatedAt.toISOString(),
});

export default async function PostPage({ 
  params 
}: { 
  params: { 
    postId: string;
    category?: string; 
    subcategory?: string;
  } 
}) {
  const { postId } = params;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: true,
      categories: true,
      subcategories: true,
    },
  });

  if (!post || post.status !== "PUBLISHED") return notFound();

  const transformedPost = transformPost(post);

  const fetchPosts = async (where: Prisma.PostWhereInput) => {
    const posts = await prisma.post.findMany({
      where,
      include: {
        author: true,
        categories: true,
        subcategories: true,
      },
    });
    return posts.map(transformPost);
  };

  const [recent, editorsPick, trending] = await Promise.all([
    fetchPosts({
      status: "PUBLISHED",
      categories: { some: { id: post.categories[0]?.id || 0 } },
      id: { not: post.id },
    }),
    fetchPosts({
      status: "PUBLISHED", 
      placement: "EDITORS_PICK",
    }),
    fetchPosts({
      status: "PUBLISHED",
      placement: "TRENDING",
    })
  ]);

  return (
    <>
      <Navbar />

      <main className="max-w-7xl mx-auto grid md:grid-cols-12 gap-6 p-4">
        <div className="md:col-span-8 space-y-4">
          <h1 className="text-3xl text-slate-700 font-[Cholontika]">{transformedPost.title}</h1>
          <div className="text-sm text-gray-500">
            ✍️ {transformedPost.author?.name} •{" "}
            {new Date(transformedPost.createdAt).toLocaleString("bn-BD")}
          </div>

          {transformedPost.featureImage && (
            <Image 
              src={transformedPost.featureImage} 
              className="rounded w-full" 
              width={1200} 
              height={600} 
              alt={transformedPost.title} 
              priority
            />
          )}

          <div
            className="prose prose-neutral max-w-none font-[NotoSerifBengali] text-xl text-neutral-700"
            dangerouslySetInnerHTML={{ __html: transformedPost.content }}
          />

          <div className="mt-6 border-t pt-4 space-x-3">
            <p className="text-sm text-gray-600 mb-1">🔗 শেয়ার করুন:</p>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                process.env.NEXT_PUBLIC_SITE_URL + `/${params.category || 'category'}/${params.subcategory || 'subcategory'}/${postId}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline text-sm"
            >
              Facebook
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                transformedPost.title + " " + process.env.NEXT_PUBLIC_SITE_URL + `/${params.category || 'category'}/${params.subcategory || 'subcategory'}/${postId}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 underline text-sm"
            >
              WhatsApp
            </a>
          </div>

          <div className="text-sm mt-4 text-gray-400">🏷️ ট্যাগ: {transformedPost.tags}</div>
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

function Section({ title, posts }: { title: string; posts: Post[] }) {
  return (
    <div>
      <h3 className="text-lg font-bold font-[NotoSerifBengali] mb-2 border-b pb-1">{title}</h3>
      <div className="space-y-2">
        {posts.map((p) => (
          <Link
            key={p.id}
            href={`/${p.categories?.[0]?.slug || "category"}/${p.subcategories?.[0]?.slug || "subcategory"}/${p.id}`}
            className="flex gap-2 text-sm group"
          >
            <Image
              src={p.featureImage}
              className="w-16 h-12 object-cover rounded"
              alt={p.title}
              height={75}
              width={300}
              priority
            />
            <span className="group-hover:underline">{p.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}