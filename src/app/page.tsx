// src/app/page.tsx

import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    include: {
      categories: true,
      subcategories: true,
      author: { select: { name: true } },
    },
    take: 10,
  });

  return (
    <main className="max-w-5xl mx-auto py-6">
      <h1 className="text-2xl font-bold mb-4">🏠 হোমপেজ</h1>

      {posts.length === 0 ? (
        <p>📭 কোনো প্রকাশিত পোস্ট নেই</p>
      ) : (
        posts.map((post) => {
          const category = post.categories[0]?.slug || "category";
          const subcategory = post.subcategories[0]?.slug || "general";

          return (
            <div key={post.id} className="border rounded p-4 mb-4 bg-white shadow">
              <Link href={`/${category}/${subcategory}/${post.id}`}>
                <div className="flex gap-4">
                  {post.featureImage && (
                    <img src={post.featureImage} alt={post.title} className="w-36 h-24 object-cover rounded" />
                  )}
                  <div>
                    <h2 className="text-lg font-semibold mb-1">{post.title}</h2>
                    <p className="text-sm text-gray-500">{post.author?.name} • {new Date(post.createdAt).toLocaleDateString("bn-BD")}</p>
                  </div>
                </div>
              </Link>
            </div>
          );
        })
      )}
    </main>
  );
}
