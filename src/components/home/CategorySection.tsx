import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

interface SidebarPost {
  id: string;
  title: string;
  featureImage: string;
  placement: string;
}

interface Props {
  slug: string;
  title: string;
  sidebarPost?: SidebarPost | null;
}

export default async function CategorySection({ slug, title, sidebarPost }: Props) {
  // Fetch only the posts for this category
  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      categories: { some: { slug } },
    },
    orderBy: { updatedAt: "desc" },
    take: 4,
    select: {
      id: true,
      title: true,
      featureImage: true,
      content: true,
      categories: { select: { slug: true } },
      subcategories: { select: { slug: true } },
    },
  });

  return (
    <div className="grid md:grid-cols-12 gap-6 bg-white p-4 rounded-xl shadow">
      {/* Posts grid */}
      <div className="md:col-span-9">
        <Link href={`/${slug}`}>
          <h2 className="text-3xl font-[Cholontika] text-red-600 mb-4">{title}</h2>
        </Link>

        <div className="grid md:grid-cols-2 gap-4">
          {posts.map((post) => {
            const cat = post.categories[0]?.slug || "category";
            const sub = post.subcategories[0]?.slug;
            const href = sub ? `/${cat}/${sub}/${post.id}` : `/${cat}/${post.id}`;

            return (
              <Link
                key={post.id}
                href={href}
                className="block border rounded-xl p-3 hover:shadow-md"
              >
                <Image
                  src={post.featureImage}
                  alt={post.title}
                  width={500}
                  height={300}
                  className="w-full h-[180px] object-cover rounded mb-2 hover:scale-105 transition-transform"
                />
                <h5 className="text-xl font-[Cholontika] mb-2 text-gray-700">{post.title}</h5>
                {post.content && (
                  <p className="text-sm text-gray-700 font-[NotoSerifBengali]">
                    {post.content.replace(/<[^>]+>/g, "").slice(0, 100)}...
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Sidebar */}
      {sidebarPost && (
        <div className="md:col-span-3">
          <h3 className="text-md font-semibold text-gray-600 mb-2">
            {sidebarPost.placement === "TRENDING" ? "🔥 ট্রেন্ডিং" : "⭐ এডিটরস পিক"}
          </h3>
          <Link
            href={`/${slug}/${sidebarPost.id}`}
            className="block rounded-xl border p-2 hover:shadow-md"
          >
            <Image
              src={sidebarPost.featureImage}
              alt={sidebarPost.title}
              width={300}
              height={200}
              className="w-full h-[150px] object-cover rounded mb-2 hover:scale-105 transition-transform"
            />
            <h4 className="font-[Cholontika] text-base text-gray-700">
              {sidebarPost.title}
            </h4>
          </Link>
        </div>
      )}
    </div>
  );
}
