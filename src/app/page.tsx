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
  updatedAt: Date; // <-- changed from string to Date
  createdAt: Date; // <-- add this too if needed
  categories: Category[];
  subcategories: Subcategory[];
}


export default async function HomePage() {
  const [
    leadPost,
    secondLeadPost,
    footballPosts,
    footballSidebar,
    cricketPosts,
    cricketSidebar,
    athleticsPosts,
    otherSportsPosts,
    sportsTechPosts,
    sportsCulturePosts,
  ] = await Promise.all([
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
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        categories: { some: { slug: "football" } },
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
      where: { status: "PUBLISHED", categories: { some: { slug: "cricket" } } },
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
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: { categories: true, subcategories: true },
    }),
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        categories: { some: { slug: "othersports" } },
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: { categories: true, subcategories: true },
    }),
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        categories: { some: { slug: "sports-tech" } },
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: { categories: true, subcategories: true },
    }),
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        categories: { some: { slug: "sports-culture" } },
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

      <main className="max-w-6xl mx-auto p-4 space-y-10">
        {/* LEAD + SECOND LEAD BLOCK */}
        <div className="grid md:grid-cols-12 gap-6">
          {leadPost && (
            <div className="md:col-span-7">
              <div className="bg-white rounded-2xl p-4 shadow-md hover:shadow-xl transition-shadow duration-300">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <div className="md:col-span-3">
                    <Link
                      href={`/${leadPost.categories?.[0]?.slug}/${leadPost.subcategories?.[0]?.slug}/${leadPost.id}`}
                    >
                      <h2 className="text-3xl font-[Cholontika] text-gray-900 hover:text-blue-900 transition-colors duration-200 mb-2">
                        {leadPost.title}
                      </h2>
                      <p className="text-base font-[NotoSerifBengali] text-gray-700 line-clamp-3">
                        {leadPost.content.replace(/<[^>]+>/g, "").slice(0, 150)}
                        ...
                      </p>
                    </Link>
                  </div>
                  <div className="md:col-span-2">
                    <Link
                      href={`/${leadPost.categories?.[0]?.slug}/${leadPost.subcategories?.[0]?.slug}/${leadPost.id}`}
                    >
                      <Image
                        src={leadPost.featureImage}
                        alt={leadPost.title}
                        width={600}
                        height={400}
                        className="rounded-xl w-full h-[250px] object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {secondLeadPost && (
            <div className="md:col-span-5">
              <div className="bg-white rounded-2xl p-4 shadow-md hover:shadow-xl transition-shadow duration-300">
                <Link
                  href={`/${secondLeadPost.categories?.[0]?.slug}/${secondLeadPost.subcategories?.[0]?.slug}/${secondLeadPost.id}`}
                >
                  <Image
                    src={secondLeadPost.featureImage}
                    alt={secondLeadPost.title}
                    width={600}
                    height={400}
                    className="rounded-xl w-full h-[250px] object-cover mb-3 hover:scale-105 transition-transform duration-300"
                  />
                  <h2 className="text-2xl font-[Cholontika] text-gray-900 hover:text-blue-800 transition-colors duration-200 mb-2">
                    {secondLeadPost.title}
                  </h2>
                  <p className="text-base font-[NotoSerifBengali] text-gray-700">
                    {secondLeadPost.content
                      .replace(/<[^>]+>/g, "")
                      .slice(0, 150)}
                    ...
                  </p>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* CATEGORY SECTIONS */}
        {renderCategorySection(
          "football",
          "⚽ ফুটবল",
          footballPosts,
          footballSidebar
        )}
        {renderCategorySection(
          "cricket",
          "🏏 ক্রিকেট",
          cricketPosts,
          cricketSidebar
        )}
        {renderCategorySection("athletics", "🏃 অ্যাথলেটিক্স", athleticsPosts)}
        {renderCategorySection(
          "othersports",
          "🎾 অন্যান্য খেলা",
          otherSportsPosts
        )}
        {renderCategorySection(
          "sports-tech",
          "💼 খেলার প্রযুক্তি ও বাণিজ্য",
          sportsTechPosts
        )}
        {renderCategorySection(
          "sports-culture",
          "🎭 খেলার জীবন ও সংস্কৃতি",
          sportsCulturePosts
        )}
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
      {/* Category Left Block */}
      <div className="md:col-span-9">
        <Link href={`/${categorySlug}`}>
          <h2 className="text-3xl font text-red-600 mb-4 font-[Cholontika]">
            {title}
          </h2>
        </Link>
        <div className="grid md:grid-cols-2 gap-4">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/${post.categories?.[0]?.slug}/${post.subcategories?.[0]?.slug}/${post.id}`}
              className="block border rounded-xl p-3 hover:shadow-md transition group"
            >
              <Image
                src={post.featureImage}
                alt={post.title}
                width={500}
                height={300}
                className="w-full h-[180px] object-cover rounded mb-2 transition-transform duration-300 group-hover:scale-105"
              />

              <h5 className="text-xl font-normal font-[Cholontika] mb-2 overflow-hidden text-ellipsis text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                {post.title}
              </h5>
              <p className="text-sm text-gray-700 font-[NotoSerifBengali]">
                {post.content.replace(/<[^>]+>/g, "").slice(0, 100)}...
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Optional Right Sidebar Block */}
      {sidebarPost && (
        <div className="md:col-span-3">
          <h3 className="text-md font-semibold text-gray-600 mb-2">
            {sidebarPost.placement === "TRENDING"
              ? "🔥 ট্রেন্ডিং"
              : "⭐ সম্পাদকের পছন্দ"}
          </h3>
          <Link
            href={`/${sidebarPost.categories?.[0]?.slug}/${sidebarPost.subcategories?.[0]?.slug}/${sidebarPost.id}`}
            className="block rounded-xl border p-2 hover:shadow-md transition group"
          >
            <Image
  src={sidebarPost.featureImage}
  alt={sidebarPost.title}
  width={300}
  height={200}
  className="w-full h-[150px] object-cover rounded mb-2 transition-transform duration-300 group-hover:scale-105"
/>

            <h4 className="font-[Cholontika] text-base font-semibold text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
              {sidebarPost.title}
            </h4>
          </Link>
        </div>
      )}
    </div>
  );
}
