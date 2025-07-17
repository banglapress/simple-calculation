import { prisma } from "@/lib/prisma";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BreakingNews from "@/components/layout/BreakingNews";
import LiveScoreBar from "@/components/home/LiveScoreBar";
import Link from "next/link";
import Image from "next/image";

interface Category {
  id: number;
  slug: string;
  name: string;
}

interface Subcategory {
  id: number;
  slug: string;
  name: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  featureImage: string;
  status: "DRAFT" | "PENDING" | "PUBLISHED";
  placement: "NONE" | "LEAD" | "SECOND_LEAD" | "EDITORS_PICK" | "TRENDING";
  updatedAt: Date;
  createdAt: Date;
  categories: Category[];
  subcategories: Subcategory[];
}

export default async function HomePage() {
  const [leadPost, secondLeadPost] = await Promise.all([
    prisma.post.findFirst({
      where: { status: "PUBLISHED", placement: "LEAD" },
      orderBy: { updatedAt: "desc" },
      include: { categories: true, subcategories: true },
    }),
    prisma.post.findFirst({
      where: { status: "PUBLISHED", placement: "SECOND_LEAD" },
      orderBy: { updatedAt: "desc" },
      include: { categories: true, subcategories: true },
    }),
  ]);

  const excludeIds = [leadPost?.id, secondLeadPost?.id].filter(Boolean) as string[];

  const [
    footballPosts,
    footballSidebar,
    cricketPosts,
    cricketSidebar,
    athleticsPosts,
    otherSportsPosts,
    sportsTechPosts,
    sportsCulturePosts,
    hockeyPosts,
  ] = await Promise.all([
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        categories: { some: { slug: "football" } },
        id: { notIn: excludeIds },
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: { categories: true, subcategories: true },
    }),
    prisma.post.findFirst({
      where: { status: "PUBLISHED", placement: "EDITORS_PICK" },
      orderBy: { updatedAt: "desc" },
      include: { categories: true, subcategories: true },
    }),
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        categories: { some: { slug: "cricket" } },
        id: { notIn: excludeIds },
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: { categories: true, subcategories: true },
    }),
    prisma.post.findFirst({
      where: { status: "PUBLISHED", placement: "TRENDING" },
      orderBy: { updatedAt: "desc" },
      include: { categories: true, subcategories: true },
    }),
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        categories: { some: { slug: "athletics" } },
        id: { notIn: excludeIds },
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: { categories: true, subcategories: true },
    }),
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        categories: { some: { slug: "othersports" } },
        id: { notIn: excludeIds },
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: { categories: true, subcategories: true },
    }),
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        categories: { some: { slug: "sports-tech" } },
        id: { notIn: excludeIds },
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: { categories: true, subcategories: true },
    }),
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        categories: { some: { slug: "sports-culture" } },
        id: { notIn: excludeIds },
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: { categories: true, subcategories: true },
    }),
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        categories: { some: { slug: "hockey" } },
        id: { notIn: excludeIds },
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: { categories: true, subcategories: true },
    }),
  ]);

  return (
    <>
      <Navbar />
      <BreakingNews />
      <LiveScoreBar />

      <main className="max-w-7xl mx-auto p-4 space-y-10">
        <div className="grid md:grid-cols-12 gap-6">
          {leadPost && (
            <div className="md:col-span-7">
              <div className="bg-white rounded-2xl p-4 shadow-md hover:shadow-xl transition-shadow duration-300">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <div className="md:col-span-3">
                    {(() => {
                      const cat = leadPost.categories[0]?.slug || "category";
                      const sub = leadPost.subcategories[0]?.slug;
                      const href = sub ? `/${cat}/${sub}/${leadPost.id}` : `/${cat}/${leadPost.id}`;
                      return (
                        <Link href={href}>
                          <h2 className="text-3xl font-[Cholontika] text-gray-900 hover:text-blue-900 mb-2">
                            {leadPost.title}
                          </h2>
                          <p className="text-base font-[NotoSerifBengali] text-gray-700 line-clamp-3">
                            {leadPost.content.replace(/<[^>]+>/g, "").slice(0, 150)}...
                          </p>
                        </Link>
                      );
                    })()}
                  </div>
                  <div className="md:col-span-2">
                    {(() => {
                      const cat = leadPost.categories[0]?.slug || "category";
                      const sub = leadPost.subcategories[0]?.slug;
                      const href = sub ? `/${cat}/${sub}/${leadPost.id}` : `/${cat}/${leadPost.id}`;
                      return (
                        <Link href={href}>
                          <Image
                            src={leadPost.featureImage}
                            alt={leadPost.title || "Post image"}
                            width={600}
                            height={400}
                            className="rounded-xl w-full h-[250px] object-cover hover:scale-105 transition-transform"
                          />
                        </Link>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {secondLeadPost && (() => {
            const cat = secondLeadPost.categories[0]?.slug || "category";
            const sub = secondLeadPost.subcategories[0]?.slug;
            const href = sub ? `/${cat}/${sub}/${secondLeadPost.id}` : `/${cat}/${secondLeadPost.id}`;
            return (
              <div className="md:col-span-5">
                <div className="bg-white rounded-2xl p-4 shadow-md hover:shadow-xl transition-shadow">
                  <Link href={href}>
                    <Image
                      src={secondLeadPost.featureImage}
                      alt={secondLeadPost.title || "Post image"}
                      width={600}
                      height={400}
                      className="rounded-xl w-full h-[250px] object-cover mb-3 hover:scale-105 transition-transform"
                    />
                    <h2 className="text-2xl font-[Cholontika] text-gray-900 hover:text-blue-800 mb-2">
                      {secondLeadPost.title}
                    </h2>
                    <p className="text-base font-[NotoSerifBengali] text-gray-700">
                      {secondLeadPost.content.replace(/<[^>]+>/g, "").slice(0, 150)}...
                    </p>
                  </Link>
                </div>
              </div>
            );
          })()}
        </div>

        {renderCategorySection("football", "⚽ ফুটবল", footballPosts, footballSidebar)}
        {renderCategorySection("cricket", "🏏 ক্রিকেট", cricketPosts, cricketSidebar)}
        {renderCategorySection("hockey", "🏑 হকি", hockeyPosts)}
        {renderCategorySection("athletics", "🏃 অ্যাথলেটিক্স", athleticsPosts)}
        {renderCategorySection("othersports", "🎾 অন্যান্য খেলা", otherSportsPosts)}
        {renderCategorySection("sports-tech", "💼 খেলার প্রযুক্তি ও বাণিজ্য", sportsTechPosts)}
        {renderCategorySection("sports-culture", "🎭 খেলার জীবন ও সংস্কৃতি", sportsCulturePosts)}
      </main>

      <Footer />
    </>
  );
}

function renderCategorySection(
  categorySlug: string,
  title: string,
  posts: Post[],
  sidebarPost?: Post | null
) {
  return (
    <div className="grid md:grid-cols-12 gap-6 bg-white p-4 rounded-xl shadow">
      <div className="md:col-span-9">
        <Link href={`/${categorySlug}`}>
          <h2 className="text-3xl font-[Cholontika] text-red-600 mb-4">
            {title}
          </h2>
        </Link>
        <div className="grid md:grid-cols-2 gap-4">
          {posts.map((post) => {
            const cat = post.categories[0]?.slug || "category";
            const sub = post.subcategories[0]?.slug;
            const href = sub ? `/${cat}/${sub}/${post.id}` : `/${cat}/${post.id}`;
            return (
              <Link key={post.id} href={href} className="block border rounded-xl p-3 hover:shadow-md">
                <Image
                  src={post.featureImage}
                  alt={post.title || "Post image"}
                  width={500}
                  height={300}
                  className="w-full h-[180px] object-cover rounded mb-2 hover:scale-105 transition-transform"
                />
                <h5 className="text-xl font-normal font-[Cholontika] mb-2 text-gray-700">
                  {post.title}
                </h5>
                <p className="text-sm text-gray-700 font-[NotoSerifBengali]">
                  {post.content.replace(/<[^>]+>/g, "").slice(0, 100)}...
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      {sidebarPost && (() => {
        const cat = sidebarPost.categories[0]?.slug || "category";
        const sub = sidebarPost.subcategories[0]?.slug;
        const href = sub ? `/${cat}/${sub}/${sidebarPost.id}` : `/${cat}/${sidebarPost.id}`;
        return (
          <div className="md:col-span-3">
            <h3 className="text-md font-semibold text-gray-600 mb-2">
              {sidebarPost.placement === "TRENDING" ? "🔥 ট্রেন্ডিং" : "⭐ সম্পাদকের পছন্দ"}
            </h3>
            <Link href={href} className="block rounded-xl border p-2 hover:shadow-md">
              <Image
                src={sidebarPost.featureImage}
                alt={sidebarPost.title || "Post image"}
                width={300}
                height={200}
                className="w-full h-[150px] object-cover rounded mb-2 hover:scale-105 transition-transform"
              />
              <h4 className="font-[Cholontika] text-base font-semibold text-gray-700">
                {sidebarPost.title}
              </h4>
            </Link>
          </div>
        );
      })()}
    </div>
  );
}
