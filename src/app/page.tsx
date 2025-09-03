import Navbar from "@/components/layout/Navbar";
import BreakingNews from "@/components/layout/BreakingNews";
import LiveScoreBar from "@/components/home/LiveScoreBar";
import Footer from "@/components/layout/Footer";
import LeadCard from "@/components/home/LeadCard";
import SecondLeadCard from "@/components/home/SecondLeadCard";
import CategorySection from "@/components/home/CategorySection";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

export default async function HomePage() {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      featureImage: true,
      content: true,
      placement: true,
      categories: { select: { slug: true } },
      subcategories: { select: { slug: true } },
    },
  });

  const leadPost = posts.find((p) => p.placement === "LEAD") || null;
  const secondLeadPost =
    posts.find((p) => p.placement === "SECOND_LEAD") || null;
  const editorsPick = posts.find((p) => p.placement === "EDITORS_PICK") || null;
  const trending = posts.find((p) => p.placement === "TRENDING") || null;

  return (
    <>
      <Navbar />
      <BreakingNews />
      <LiveScoreBar />

      <main className="max-w-7xl mx-auto p-4 space-y-10">
        <div className="grid md:grid-cols-12 gap-6">
          <div className="md:col-span-7 space-y-6">
            {leadPost && <LeadCard post={leadPost} />}
            <div className="w-full h-[75px] bg-gray-200 rounded-xl flex items-center justify-center text-sm text-gray-600">
              Advertisement
            </div>
          </div>

          {secondLeadPost && (
            <div className="md:col-span-5">
              <SecondLeadCard post={secondLeadPost} />
            </div>
          )}
        </div>

        {/* Each category fetches its own posts, no .filter needed */}
        <CategorySection
          slug="football"
          title="⚽ ফুটবল"
          sidebarPost={editorsPick}
        />
        <CategorySection
          slug="cricket"
          title="🏏 ক্রিকেট"
          sidebarPost={trending}
        />
        <CategorySection slug="hockey" title="🏑 হকি" />
        <CategorySection slug="athletics" title="🏃 অ্যাথলেটিক্স" />
        <CategorySection slug="othersports" title="🎾 অন্যান্য খেলা" />
        <CategorySection
          slug="sports-tech"
          title="💼 খেলার প্রযুক্তি ও বাণিজ্য"
        />
        <CategorySection
          slug="sports-culture"
          title="🎭 খেলার জীবন ও সংস্কৃতি"
        />
      </main>

      <Footer />
    </>
  );
}
