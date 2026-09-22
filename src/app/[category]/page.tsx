import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  getPublicCategoryBySlug,
  getPublicCategoryPosts,
} from "@/lib/public-data";
import { notFound } from "next/navigation";

export const revalidate = 60;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.khelatv.com";

export async function generateMetadata({
  params,
}: {
  params: { category: string };
}): Promise<Metadata> {
  const category = await getPublicCategoryBySlug(params.category);

  if (!category) return {};

  return {
    title: category.name,
    description: category.name + " বিভাগের সর্বশেষ খেলা ও সংবাদ",
    alternates: {
      canonical: SITE_URL + "/" + category.slug,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const category = await getPublicCategoryBySlug(params.category);

  if (!category) return notFound();

  const posts = await getPublicCategoryPosts(category.slug);

  return (
    <>
      <Navbar />

      <main className="max-w-7xl mx-auto p-4 space-y-6">
        <header className="border-b pb-4">
          <h1 className="text-3xl font-bold font-[NotoSerifBengali]">
            {category.name}
          </h1>
          {category.subcategories.length > 0 && (
            <nav className="flex flex-wrap gap-2 mt-4">
              {category.subcategories.map((subcategory) => (
                <Link
                  key={subcategory.id}
                  href={"/" + category.slug + "/" + subcategory.slug}
                  className="px-3 py-1.5 rounded-full border bg-white text-sm hover:bg-gray-50"
                >
                  {subcategory.name}
                </Link>
              ))}
            </nav>
          )}
        </header>

        {posts.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-gray-500">
            এই ক্যাটাগরিতে এখনো কোনো প্রকাশিত সংবাদ নেই।
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map((post) => {
              const categorySlug = post.categories[0]?.slug || category.slug;
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
        )}
      </main>

      <Footer />
    </>
  );
}
